// D2 — Personalised Drug Interaction Reasoning
// Owner: Dev B
// Endpoint: POST /functions/v1/drug-interaction
//
// Called on debounce as doctor types a new drug name.
// Reasons over this specific patient's full record — not a lookup table.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  const { patientId, newDrug, proposedDosage } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch patient context
  const [patientRes, prescriptionsRes] = await Promise.all([
    supabase
      .from("patients")
      .select("name, age, condition_tags, allergies")
      .eq("id", patientId)
      .single(),

    supabase
      .from("prescriptions")
      .select("drugs")
      .eq("patient_id", patientId)
      .eq("status", "active"),
  ]);

  const patient = patientRes.data;
  const currentMeds = (prescriptionsRes.data || [])
    .flatMap((p: any) => p.drugs || [])
    .map((d: any) => ({ name: d.name, dosage: d.dosage }));

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
          content: `You are a clinical pharmacology assistant.
Analyse drug interactions for a SPECIFIC patient — not generic warnings.
Consider their age, diagnoses, current medications, allergies, and any metabolic factors.

Return ONLY valid JSON:
{
  "riskLevel": "safe"|"caution"|"contraindicated",
  "reasoning": string,
  "patientSpecificFactors": string[],
  "interactions": [{ "withDrug": string, "mechanism": string, "severity": string }],
  "alternatives": [{ "name": string, "rationale": string }],
  "monitoringRequired": string|null
}`,
        },
        {
          role: "user",
          content: `Patient: ${patient.age}yo, Diagnoses: ${patient.condition_tags.join(", ")}, 
Allergies: ${patient.allergies.join(", ") || "none documented"},
Current medications: ${JSON.stringify(currentMeds)},
Proposed new drug: ${newDrug}${proposedDosage ? ` at ${proposedDosage}` : ""}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const groqData = await groqRes.json();
  const analysis = JSON.parse(groqData.choices[0].message.content);

  return new Response(
    JSON.stringify({ drug: newDrug, analysis }),
    { headers: { "Content-Type": "application/json" } }
  );
});
