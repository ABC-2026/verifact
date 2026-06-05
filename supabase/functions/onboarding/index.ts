// P1 — Conversational Health Onboarding
// Owner: Dev A
// Endpoint: POST /functions/v1/onboarding
//
// Each call is one turn in the onboarding conversation.
// Accumulates extracted JSON across turns, writes to `patients` table on completion.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Verifact's health onboarding assistant.
Your job is to have a friendly, natural conversation to build a patient's health profile.
Ask one or two questions at a time. Cover: name, age, current conditions, medications,
allergies, family history, insurance provider, preferred language.
Infer missing info where possible; ask clarifying questions when needed.

After each turn, output a JSON block at the end of your message in this exact format:
<extracted>
{
  "name": string | null,
  "age": number | null,
  "conditions": string[],
  "medications": string[],
  "allergies": string[],
  "family_history": object,
  "insurance_provider": string | null,
  "language_pref": string | null,
  "onboarding_complete": boolean
}
</extracted>

Set onboarding_complete: true only when you have enough info to create a basic record.`;

serve(async (req) => {
  const { userId, messages, partialRecord } = await req.json();

  // Call Groq with full conversation history
  const groqRes = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.4,
    }),
  });

  const groqData = await groqRes.json();
  const reply = groqData.choices[0].message.content;

  // Parse the <extracted> block
  const match = reply.match(/<extracted>([\s\S]*?)<\/extracted>/);
  const extracted = match ? JSON.parse(match[1]) : null;
  const cleanReply = reply.replace(/<extracted>[\s\S]*?<\/extracted>/, "").trim();

  // Merge with any previous partial record
  const merged = { ...(partialRecord || {}), ...(extracted || {}) };

  // If onboarding is complete, write to Supabase
  if (extracted?.onboarding_complete) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("patients").upsert({
      user_id: userId,
      name: merged.name,
      age: merged.age,
      language_pref: merged.language_pref || "en",
      condition_tags: merged.conditions || [],
      allergies: merged.allergies || [],
      family_history: merged.family_history || {},
      // phone is set during auth — not from conversation
    });
  }

  return new Response(
    JSON.stringify({ reply: cleanReply, extracted: merged }),
    { headers: { "Content-Type": "application/json" } }
  );
});
