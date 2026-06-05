// D3 — AI Prescription Drafting
// Owner: Dev B
// Endpoint: POST /functions/v1/prescription-draft
//
// Doctor enters a diagnosis. AI drafts a prescription personalised to this patient.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  const { patientId, diagnosis, doctorId } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [patientRes, prescriptionsRes] = await Promise.all([
    supabase
      .from("patients")
      .select("age, condition_tags, allergies")
      .eq("id", patientId)
      .single(),

    supabase
      .from("prescriptions")
      .select("drugs")
      .eq("patient_id", patientId)
      .eq("status", "active"),
  ]);

  const patient = patientRes.data;
  const currentMeds = (prescriptionsRes.data || []).flatMap((p: any) => p.drugs || []);

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
          content: `You are a clinical prescribing assistant following Indian standard treatment guidelines.
Draft a prescription for the given diagnosis, personalised to this specific patient.
- Avoid drugs the patient is allergic to
- Avoid duplicating current medications (escalate if needed)
- Adjust for age and comorbidities
- Use generic drug names

Return ONLY valid JSON:
{
  "drugs": [
    {
      "name": string,
      "dosage": string,
      "frequency": string,
      "duration": string,
      "notes": string
    }
  ],
  "clinicalRationale": string,
  "warnings": string[],
  "followUpIn": string
}`,
        },
        {
          role: "user",
          content: `Diagnosis: ${diagnosis}
Patient: ${patient.age}yo, Conditions: ${patient.condition_tags.join(", ")},
Allergies: ${patient.allergies.join(", ") || "none"},
Current medications: ${JSON.stringify(currentMeds.map((m: any) => m.name))}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const groqData = await groqRes.json();
  const draft = JSON.parse(groqData.choices[0].message.content);

  return new Response(
    JSON.stringify({ diagnosis, draft }),
    { headers: { "Content-Type": "application/json" } }
  );
});
