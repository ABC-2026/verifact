// A2 — Vitals Intake with AI Contextualisation
// Owner: Dev C
// Endpoint: POST /functions/v1/vitals-intake
//
// Admin records vitals. AI immediately contextualises against 30-day baseline
// and recent check-ins, generating a note for the doctor.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  const { patientId, bp, temp, weight, spo2, recordedBy } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch 30-day vitals history + last 3 check-ins in parallel
  const [vitalsHistoryRes, recentNotesRes] = await Promise.all([
    supabase
      .from("vitals")
      .select("bp, temp, weight, spo2, recorded_at")
      .eq("patient_id", patientId)
      .gte("recorded_at", thirtyDaysAgo)
      .order("recorded_at", { ascending: false }),

    supabase
      .from("voice_notes")
      .select("extracted_data, recorded_at")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(3),
  ]);

  const vitalsHistory = vitalsHistoryRes.data || [];
  const recentNotes = recentNotesRes.data || [];

  // Compute 30-day averages
  const avgVitals = computeAverages(vitalsHistory);

  // Generate AI contextualisation
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
          content: `You are a clinical contextualisation assistant.
Given today's vitals, 30-day averages, and recent patient check-in symptoms, write
a one-sentence clinical note for the attending doctor.
Be specific about deviations and their potential clinical significance.
Return ONLY JSON: { "contextNote": string, "alerts": string[] }`,
        },
        {
          role: "user",
          content: JSON.stringify({
            todayVitals: { bp, temp, weight, spo2 },
            thirtyDayAvg: avgVitals,
            recentSymptoms: recentNotes.flatMap(
              (n: any) => n.extracted_data?.symptoms || []
            ),
          }),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const groqData = await groqRes.json();
  const { contextNote, alerts } = JSON.parse(groqData.choices[0].message.content);

  // Write vitals + context note
  const { data: vitalsRecord } = await supabase
    .from("vitals")
    .insert({
      patient_id: patientId,
      bp,
      temp,
      weight,
      spo2,
      context_note: contextNote,
      recorded_by: recordedBy,
    })
    .select()
    .single();

  return new Response(
    JSON.stringify({ vitals: vitalsRecord, contextNote, alerts }),
    { headers: { "Content-Type": "application/json" } }
  );
});

function computeAverages(records: any[]) {
  if (!records.length) return null;

  const temps = records.map((r: any) => r.temp).filter(Boolean);
  const weights = records.map((r: any) => r.weight).filter(Boolean);
  const spo2s = records.map((r: any) => r.spo2).filter(Boolean);

  return {
    temp: temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null,
    weight: weights.length ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : null,
    spo2: spo2s.length ? (spo2s.reduce((a, b) => a + b, 0) / spo2s.length).toFixed(1) : null,
    bpReadings: records.map((r: any) => r.bp).filter(Boolean).slice(0, 5),
  };
}
