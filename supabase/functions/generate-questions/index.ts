import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, ageGroup, genre, documentText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a friendly podcast coach for kids aged ${ageGroup}. 
Given a podcast topic, genre, and optional document context, generate:
1. A short, fun introduction paragraph (2-3 sentences)
2. Exactly 3 interesting questions to ask the podcaster
3. A short, cheerful goodbye message (1-2 sentences)

Keep language simple and age-appropriate. Make questions engaging and open-ended.`;

    const userPrompt = `Topic: ${topic}
Genre: ${genre}
Age Group: ${ageGroup}
${documentText ? `\nDocument context:\n${documentText}` : ""}

Generate the introduction, 3 questions, and goodbye.`;

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
          { role: "user", content: userPrompt },
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
                  introduction: { type: "string", description: "A fun intro paragraph" },
                  question_1: { type: "string", description: "First question" },
                  question_2: { type: "string", description: "Second question" },
                  question_3: { type: "string", description: "Third question" },
                  goodbye: { type: "string", description: "A cheerful goodbye" },
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
