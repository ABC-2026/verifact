// D4 — Pattern-Based Deterioration Alerts
// Owner: Dev B
// Endpoint: POST /functions/v1/deterioration-alerts  (cron, runs every 6h)
//
// Detects cross-note patterns that no single red flag would catch.
// Also flags behaviour anomalies (duration drop, time shift).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get all monitored patients
  const { data: patients } = await supabase
    .from("patients")
    .select("id, name")
    .eq("monitoring_enrolled", true);

  const alerts: any[] = [];

  for (const patient of patients || []) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [notesRes, baselineRes] = await Promise.all([
      supabase
        .from("voice_notes")
        .select("transcript, extracted_data, duration_sec, recorded_at")
        .eq("patient_id", patient.id)
        .gte("recorded_at", sevenDaysAgo)
        .order("recorded_at", { ascending: true }),

      supabase
        .from("patient_baselines")
        .select("avg_note_duration_sec, avg_record_hour, symptom_frequencies")
        .eq("patient_id", patient.id)
        .single(),
    ]);

    const notes = notesRes.data || [];
    const baseline = baselineRes.data;

    if (notes.length < 3) continue; // need at least 3 data points

    // ── Behaviour anomaly detection (rule-based) ─────────────────────────────
    const behaviourFlags: string[] = [];

    if (baseline) {
      const recentDurations = notes.map((n: any) => n.duration_sec).filter(Boolean);
      const avgRecentDuration = recentDurations.reduce((a: number, b: number) => a + b, 0) / recentDurations.length;

      if (
        baseline.avg_note_duration_sec &&
        avgRecentDuration < baseline.avg_note_duration_sec * 0.5
      ) {
        behaviourFlags.push(
          `Note duration dropped from avg ${Math.round(baseline.avg_note_duration_sec)}s to ${Math.round(avgRecentDuration)}s`
        );
      }

      const recentHours = notes.map((n: any) => new Date(n.recorded_at).getHours());
      const avgRecentHour = recentHours.reduce((a: number, b: number) => a + b, 0) / recentHours.length;

      if (
        baseline.avg_record_hour !== null &&
        Math.abs(avgRecentHour - baseline.avg_record_hour) > 3
      ) {
        behaviourFlags.push(
          `Recording time shifted from usual ${Math.round(baseline.avg_record_hour)}:00 to around ${Math.round(avgRecentHour)}:00`
        );
      }
    }

    // ── LLM trend analysis ───────────────────────────────────────────────────
    const notesSummary = notes.map((n: any) => ({
      date: n.recorded_at,
      extracted: n.extracted_data,
    }));

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
            content: `Analyse this sequence of patient check-ins for concerning trends.
Focus on: gradual worsening across green check-ins, recurring symptoms, declining mood pattern.
Return ONLY JSON: { "anomaly": boolean, "reasoning": string, "severity": "low"|"medium"|"high" }`,
          },
          { role: "user", content: JSON.stringify(notesSummary) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const groqData = await groqRes.json();
    const trendAnalysis = JSON.parse(groqData.choices[0].message.content);

    if (trendAnalysis.anomaly || behaviourFlags.length > 0) {
      alerts.push({
        patientId: patient.id,
        patientName: patient.name,
        trendAnomaly: trendAnalysis,
        behaviourFlags,
      });

      // Write to notifications for assigned doctors
      const { data: assignments } = await supabase
        .from("doctor_patients")
        .select("doctors(user_id, phone, name)")
        .eq("patient_id", patient.id);

      for (const a of assignments || []) {
        const doctor = (a as any).doctors;
        if (doctor?.user_id) {
          await supabase.from("notifications").insert({
            recipient_id: doctor.user_id,
            recipient_type: "doctor",
            message: `Pattern alert for ${patient.name}: ${trendAnalysis.reasoning}${
              behaviourFlags.length ? " | Behaviour: " + behaviourFlags.join("; ") : ""
            }`,
            channel: "in_app",
          });
        }
      }
    }
  }

  // Update patient baselines while we're here (rolling 30-day avg)
  await updateBaselines(supabase, patients || []);

  return new Response(
    JSON.stringify({ alertsGenerated: alerts.length, alerts }),
    { headers: { "Content-Type": "application/json" } }
  );
});

async function updateBaselines(supabase: any, patients: any[]) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const patient of patients) {
    const { data: notes } = await supabase
      .from("voice_notes")
      .select("duration_sec, recorded_at, extracted_data")
      .eq("patient_id", patient.id)
      .gte("recorded_at", thirtyDaysAgo);

    if (!notes || notes.length < 5) continue;

    const durations = notes.map((n: any) => n.duration_sec).filter(Boolean);
    const hours = notes.map((n: any) => new Date(n.recorded_at).getHours());

    const avgDuration = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
    const avgHour = hours.reduce((a: number, b: number) => a + b, 0) / hours.length;

    await supabase.from("patient_baselines").upsert({
      patient_id: patient.id,
      avg_note_duration_sec: avgDuration,
      avg_record_hour: avgHour,
      computed_at: new Date().toISOString(),
    });
  }
}
