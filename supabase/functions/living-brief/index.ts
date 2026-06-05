// D1 — Living Patient Brief
// Owner: Dev B
// Endpoint: POST /functions/v1/living-brief
//
// Regenerated every time a doctor opens a patient record.
// Synthesises last 30 voice notes, triage results, prescriptions, vitals, family history.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  const { patientId } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch all context in parallel
  const [notesRes, triageRes, prescriptionsRes, vitalsRes, patientRes] = await Promise.all([
    supabase
      .from("voice_notes")
      .select("transcript, extracted_data, recorded_at")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(30),

    supabase
      .from("triage_results")
      .select("severity, summary, reasoning, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(30),

    supabase
      .from("prescriptions")
      .select("drugs, created_at, status")
      .eq("patient_id", patientId)
      .eq("status", "active"),

    supabase
      .from("vitals")
      .select("bp, temp, weight, spo2, context_note, recorded_at")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(10),

    supabase
      .from("patients")
      .select("name, age, condition_tags, allergies, family_history, language_pref")
      .eq("id", patientId)
      .single(),
  ]);

  const context = {
    patient: patientRes.data,
    recentNotes: notesRes.data || [],
    triageHistory: triageRes.data || [],
    activePrescriptions: prescriptionsRes.data || [],
    recentVitals: vitalsRes.data || [],
  };

  // Build symptom trend from extracted_data
  const symptomTimeline = (notesRes.data || []).map((note: any) => ({
    date: note.recorded_at,
    symptoms: note.extracted_data?.symptoms || [],
    mood: note.extracted_data?.mood,
  }));

  // Compute adherence score (medications taken / total check-ins with medication data)
  const checkins = (notesRes.data || []).filter(
    (n: any) => n.extracted_data?.medications_status?.length > 0
  );
  const takenCount = checkins.reduce((acc: number, n: any) => {
    const taken = n.extracted_data.medications_status.filter((m: any) => m.taken).length;
    const total = n.extracted_data.medications_status.length;
    return acc + (total > 0 ? taken / total : 0);
  }, 0);
  const adherenceScore = checkins.length > 0
    ? Math.round((takenCount / checkins.length) * 100)
    : null;

  // Call Groq to generate the brief
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
          content: `You are a clinical summarisation assistant for a doctor.
Generate a concise patient brief covering:
1. Changes since last visit
2. Symptom trend (improving/worsening/stable)
3. Medication adherence summary
4. Open flags or concerns
5. Relevant family history
6. One-paragraph narrative

Return ONLY valid JSON:
{
  "narrative": string,
  "symptomTrend": "improving"|"worsening"|"stable"|"insufficient_data",
  "openFlags": string[],
  "adherenceScore": number|null,
  "keyChanges": string[],
  "recommendation": string
}`,
        },
        {
          role: "user",
          content: JSON.stringify({ ...context, symptomTimeline, adherenceScore }),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const groqData = await groqRes.json();
  const brief = JSON.parse(groqData.choices[0].message.content);

  return new Response(
    JSON.stringify({
      brief: { ...brief, adherenceScore },
      symptomTimeline,
      meta: { generatedAt: new Date().toISOString(), checkinsAnalysed: notesRes.data?.length },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
