import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let voiceId: string | null = null;

  try {
    const { voiceBase64, activityId, sections } = await req.json();
    // sections: { introduction, question_1, question_2, question_3, goodbye }

    if (!voiceBase64 || !activityId || !sections) {
      throw new Error("Missing required fields: voiceBase64, activityId, sections");
    }

    // 1. Clone voice from teacher's recording
    console.log("Cloning voice...");
    const voiceBytes = Uint8Array.from(atob(voiceBase64), (c) => c.charCodeAt(0));
    const voiceBlob = new Blob([voiceBytes], { type: "audio/webm" });

    const formData = new FormData();
    formData.append("name", `teacher-${activityId}`);
    formData.append("files", voiceBlob, "voice.webm");

    const cloneRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: formData,
    });

    if (!cloneRes.ok) {
      const errText = await cloneRes.text();
      console.error("Voice clone error:", cloneRes.status, errText);
      throw new Error(`Voice cloning failed [${cloneRes.status}]: ${errText}`);
    }

    const cloneData = await cloneRes.json();
    voiceId = cloneData.voice_id;
    console.log("Voice cloned:", voiceId);

    // 2. Generate TTS for each section
    const sectionKeys = ["introduction", "question_1", "question_2", "question_3", "goodbye"] as const;
    const audioUrls: Record<string, string> = {};

    for (const key of sectionKeys) {
      const text = sections[key];
      if (!text || text.trim().length === 0) continue;

      console.log(`Generating TTS for ${key}...`);
      const ttsRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        console.error(`TTS error for ${key}:`, ttsRes.status, errText);
        continue; // Skip this section but continue with others
      }

      const audioBuffer = await ttsRes.arrayBuffer();
      const fileName = `tts-${activityId}-${key}-${Date.now()}.mp3`;

      const { error: uploadErr } = await supabase.storage
        .from("voices")
        .upload(fileName, new Uint8Array(audioBuffer), { contentType: "audio/mpeg" });

      if (uploadErr) {
        console.error(`Upload error for ${key}:`, uploadErr);
        continue;
      }

      const { data: urlData } = supabase.storage.from("voices").getPublicUrl(fileName);
      audioUrls[`${key}_audio_url`] = urlData.publicUrl;
      console.log(`Generated ${key} audio:`, urlData.publicUrl);
    }

    // 3. Update activity with audio URLs
    if (Object.keys(audioUrls).length > 0) {
      const { error: updateErr } = await supabase
        .from("activities")
        .update(audioUrls)
        .eq("id", activityId);

      if (updateErr) {
        console.error("Update error:", updateErr);
        throw new Error(`Failed to update activity: ${updateErr.message}`);
      }
    }

    // 4. Cleanup: delete cloned voice
    if (voiceId) {
      console.log("Cleaning up cloned voice...");
      await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });
    }

    return new Response(JSON.stringify({ success: true, audioUrls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Cleanup voice on error too
    if (voiceId) {
      try {
        await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
          method: "DELETE",
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        });
      } catch {}
    }

    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
