import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { curriculumText, curriculumBase64, ageGroup } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a curriculum specialist and podcast coach for kids aged ${ageGroup}.
Given a curriculum document, generate exactly 10 distinct podcast activities covering key topics from the curriculum.
Each activity should have a unique topic, an appropriate genre, an introduction prompt, 3 questions, and a goodbye prompt.
The introduction and goodbye should be instructions directed at the child podcaster (not scripts to read).
Keep language age-appropriate for ${ageGroup}. Make questions engaging and open-ended.`;

    const userContent: any[] = [
      { type: "text", text: `Age Group: ${ageGroup}\n\nGenerate 10 podcast activities from the following curriculum.${curriculumText ? `\n\nCurriculum content:\n${curriculumText}` : ""}` },
    ];

    if (curriculumBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:application/pdf;base64,${curriculumBase64}` },
      });
    }

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
              name: "generate_activities",
              description: "Return 10 podcast activities from the curriculum",
              parameters: {
                type: "object",
                properties: {
                  activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string", description: "Short, specific topic title" },
                        genre: { type: "string", enum: ["education", "storytelling", "science", "adventure", "comedy", "music"] },
                        introduction: { type: "string", description: "Prompt telling the child to introduce themselves and the topic" },
                        question_1: { type: "string" },
                        question_2: { type: "string" },
                        question_3: { type: "string" },
                        goodbye: { type: "string", description: "Prompt telling the child to wrap up" },
                      },
                      required: ["topic", "genre", "introduction", "question_1", "question_2", "question_3", "goodbye"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["activities"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_activities" } },
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
