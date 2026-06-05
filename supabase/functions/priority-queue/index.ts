// A1 — AI Patient Priority Queue
// Owner: Dev C
// Endpoint: POST /functions/v1/priority-queue/score  (triggered after each triage write)
//           GET  /functions/v1/priority-queue         (returns ranked list for admin)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  const url = new URL(req.url);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // GET — return ranked patient list
  if (req.method === "GET") {
    const { data: scores } = await supabase
      .from("priority_scores")
      .select(`
        score, reasoning, updated_at,
        patients (id, name, condition_tags)
      `)
      .order("score", { ascending: false });

    return new Response(JSON.stringify({ queue: scores }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // POST — recalculate score for one patient (called after triage write)
  const { patientId } = await req.json();
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const [triageRes, patientRes, lastContactRes, openFlagsRes] = await Promise.all([
    supabase
      .from("triage_results")
      .select("severity, created_at")
      .eq("patient_id", patientId)
      .gte("created_at", seventyTwoHoursAgo)
      .order("created_at", { ascending: false }),

    supabase
      .from("patients")
      .select("name, condition_tags, created_at")
      .eq("id", patientId)
      .single(),

    supabase
      .from("voice_notes")
      .select("recorded_at")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(1),

    supabase
      .from("notifications")
      .select("id")
      .eq("recipient_type", "doctor")
      .is("read_at", null),
  ]);

  const recentTriage = triageRes.data || [];
  const lastContactTime = lastContactRes.data?.[0]?.recorded_at;
  const hoursSinceContact = lastContactTime
    ? (Date.now() - new Date(lastContactTime).getTime()) / (1000 * 60 * 60)
    : 999;

  // Diagnosis acuity mapping (hardcoded for v1, configurable in v2)
  const acuityMap: Record<string, number> = {
    cardiac: 90,
    post_surgery: 85,
    stroke: 85,
    cancer: 80,
    diabetes: 60,
    hypertension: 55,
    asthma: 50,
    default: 40,
  };
  const primaryCondition = patientRes.data?.condition_tags?.[0] || "default";
  const diagnosisAcuity = acuityMap[primaryCondition] || acuityMap.default;

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
          content: `You are a clinical priority scoring system.
Given patient data, output a priority score 1–100 (100 = most urgent) and one-line reasoning.
Return ONLY JSON: { "score": number, "reasoning": string }`,
        },
        {
          role: "user",
          content: JSON.stringify({
            recentTriageResults: recentTriage,
            hoursSinceLastContact: Math.round(hoursSinceContact),
            diagnosisAcuity,
            conditions: patientRes.data?.condition_tags,
          }),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const groqData = await groqRes.json();
  const { score, reasoning } = JSON.parse(groqData.choices[0].message.content);

  await supabase.from("priority_scores").upsert({
    patient_id: patientId,
    score,
    reasoning,
    updated_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ patientId, score, reasoning }), {
    headers: { "Content-Type": "application/json" },
  });
});
