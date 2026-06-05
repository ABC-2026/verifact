// P2 — Prescription Intelligence
// Owner: Dev A
// Endpoint: POST /functions/v1/prescription-intel
//
// Step 1: GPT-4o Vision extracts structured drugs from prescription photo
// Step 2: Groq translates + explains each drug in patient's language
// Step 3: Generates reminder schedule → writes to reminders table

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

serve(async (req) => {
  const { patientId, imageBase64, languagePref } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── STEP 1: GPT-4o Vision extraction ──────────────────────────────────────
  const visionRes = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all drugs from this prescription. Return ONLY valid JSON:
{
  "drugs": [
    {
      "name": string,
      "dosage": string,
      "frequency": string,
      "duration": string
    }
  ]
}`,
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 800,
    }),
  });

  const visionData = await visionRes.json();
  const extractedText = visionData.choices[0].message.content;
  const { drugs } = JSON.parse(extractedText.replace(/```json|```/g, "").trim());

  // ── STEP 2: Groq translation + explanation ─────────────────────────────────
  const groqRes = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a patient-friendly pharmacist. For each drug, provide:
- translated name in ${languagePref}
- plain-language explanation (Class 8 reading level)
- food/lifestyle interactions to avoid
Return ONLY valid JSON array.`,
        },
        {
          role: "user",
          content: `Explain these drugs: ${JSON.stringify(drugs)}
Return format: [{ "name": string, "translated_name": string, "explanation": string, "avoid": string[] }]`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const groqData = await groqRes.json();
  const explanations = JSON.parse(groqData.choices[0].message.content);

  // Merge extraction + explanations
  const enrichedDrugs = drugs.map((drug: any, i: number) => ({
    ...drug,
    ...(explanations.drugs?.[i] || explanations[i] || {}),
  }));

  // ── STEP 3: Write prescription + generate reminders ────────────────────────
  const { data: prescription, error } = await supabase
    .from("prescriptions")
    .insert({
      patient_id: patientId,
      drugs: enrichedDrugs,
      extracted_from_image: true,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;

  // Parse frequency → scheduled times
  const reminders = drugs.flatMap((drug: any) => {
    const times = parseFrequency(drug.frequency);
    return times.map((time: string) => ({
      patient_id: patientId,
      prescription_id: prescription.id,
      drug_name: drug.name,
      scheduled_time: time,
    }));
  });

  if (reminders.length > 0) {
    await supabase.from("reminders").insert(reminders);
  }

  return new Response(
    JSON.stringify({ prescription, drugs: enrichedDrugs, remindersCreated: reminders.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});

// Maps frequency strings to HH:MM times
function parseFrequency(frequency: string): string[] {
  const f = frequency.toLowerCase();
  if (f.includes("once") || f.includes("1x")) return ["08:00"];
  if (f.includes("twice") || f.includes("2x") || f.includes("bd")) return ["08:00", "20:00"];
  if (f.includes("three") || f.includes("3x") || f.includes("tds")) return ["08:00", "14:00", "20:00"];
  if (f.includes("four") || f.includes("4x") || f.includes("qid")) return ["07:00", "12:00", "17:00", "22:00"];
  if (f.includes("morning")) return ["08:00"];
  if (f.includes("night") || f.includes("bedtime")) return ["21:00"];
  return ["08:00"]; // default
}
