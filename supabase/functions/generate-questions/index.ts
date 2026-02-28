import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, ageGroup, genre, documentText, documentBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch training materials from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: materials } = await supabase
      .from("training_materials")
      .select("file_name, content, file_url")
      .order("created_at", { ascending: false });

    const textMaterials = (materials || []).filter((m: any) => m.content && m.content.length > 0);
    const pdfMaterials = (materials || []).filter((m: any) => (!m.content || m.content.length === 0) && m.file_url);

    const trainingContext = textMaterials.length > 0
      ? textMaterials
          .map((m: any) => `--- ${m.file_name} ---\n${m.content}`)
          .join("\n\n")
      : "";

    // Fetch PDF training materials as base64
    const pdfParts: any[] = [];
    for (const m of pdfMaterials) {
      try {
        const res = await fetch(m.file_url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          pdfParts.push({
            type: "image_url",
            image_url: { url: `data:application/pdf;base64,${b64}` },
          });
        }
      } catch (e) {
        console.error(`Failed to fetch training PDF ${m.file_name}:`, e);
      }
    }

    const systemPrompt = `You are a friendly podcast coach for kids aged ${ageGroup}. 
Given a podcast topic, genre, and context materials, generate:
1. An introduction prompt — this tells the podcaster (the child) to introduce themselves and the topic to the audience. For younger kids (5-7), keep it simple like "Say hello and tell us your name and what your podcast is about!" For older kids (10-12), make it more sophisticated like "Welcome your listeners, introduce yourself, and give a brief overview of today's topic and why it matters."
2. Exactly 3 interesting questions for the podcaster to answer
3. A goodbye prompt — this tells the podcaster to wrap up and thank the audience. For younger kids, keep it simple like "Say goodbye and thank you to everyone listening!" For older kids, make it richer like "Summarise what you discussed, thank your audience for tuning in, and tease what might come next."

Keep language simple and age-appropriate for ${ageGroup}. Make questions engaging and open-ended. The introduction and goodbye should be written as instructions/prompts directed at the child podcaster, not as scripts to read verbatim.
${trainingContext ? `\nYou have the following training materials as background knowledge. Use them to inform your questions where relevant:\n\n${trainingContext}` : ""}`;

    const userPromptText = `Topic: ${topic}
Genre: ${genre}
Age Group: ${ageGroup}
${documentText ? `\nAdditional document provided by the teacher:\n${documentText}` : ""}

Generate the introduction, 3 questions, and goodbye.`;

    // Build user message content - multipart if PDFs are attached
    const userContent: any[] = [{ type: "text", text: userPromptText }];
    // Add activity-specific PDF
    if (documentBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:application/pdf;base64,${documentBase64}` },
      });
    }
    // Add training material PDFs
    userContent.push(...pdfParts);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_podcast_content",
              description: "Generate podcast introduction, questions, and goodbye",
              parameters: {
                type: "object",
                properties: {
                  introduction: { type: "string", description: "A prompt telling the child podcaster to introduce themselves and the topic" },
                  question_1: { type: "string", description: "First question for the podcaster to answer" },
                  question_2: { type: "string", description: "Second question for the podcaster to answer" },
                  question_3: { type: "string", description: "Third question for the podcaster to answer" },
                  goodbye: { type: "string", description: "A prompt telling the child podcaster to say goodbye and thank the audience" },
                },
                required: ["introduction", "question_1", "question_2", "question_3", "goodbye"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_podcast_content" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits needed. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
