import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RiskLevel, TriageResult, VoiceNote, PrescriptionRow } from "@/lib/verifact-data";

// Marker prefix used to distinguish review events from real voice notes
const REVIEW_MARKER = "__REVIEWED__:";

export interface PatientIntelligence {
  triage: TriageResult | null;
  notes: VoiceNote[];
  prescriptions: PrescriptionRow[];
  timeline: TimelineItem[];
  isReviewed: boolean;
}

export interface TimelineItem {
  id: string;
  kind: "triage" | "note" | "prescription" | "review";
  title: string;
  detail: string;
  timestamp: string;
  severity?: RiskLevel;
}

export function usePatientIntelligence(patientId: string | null) {
  const [data, setData] = useState<PatientIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!patientId) { setData(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const [{ data: triageRows, error: e1 }, { data: noteRows, error: e2 }, { data: rxRows, error: e3 }] = await Promise.all([
        supabase.from("triage_results").select("id, patient_id, summary, reasoning, severity, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(10),
        supabase.from("voice_notes").select("id, patient_id, transcript, audio_url").eq("patient_id", patientId),
        supabase.from("prescriptions").select("id, patient_id, doctor_id, status, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      const err = e1 ?? e2 ?? e3;
      if (err) { setError(err.message); setData(null); setLoading(false); return; }

      const triageList: TriageResult[] = (triageRows ?? []).map((r) => ({
        id: r.id, patientId: r.patient_id, summary: r.summary ?? "", reasoning: r.reasoning ?? "",
        severity: (r.severity as RiskLevel) ?? "low", createdAt: r.created_at,
      }));

      // Separate review events from real voice notes by the marker prefix
      const allNoteRows = noteRows ?? [];
      const reviewNotes = allNoteRows.filter((r) => (r.transcript ?? "").startsWith(REVIEW_MARKER));
      const realNotes: VoiceNote[] = allNoteRows
        .filter((r) => !(r.transcript ?? "").startsWith(REVIEW_MARKER))
        .map((r) => ({
          id: r.id, patientId: r.patient_id, transcript: r.transcript, audioUrl: r.audio_url,
        }));

      const prescriptions: PrescriptionRow[] = (rxRows ?? []).map((r) => ({
        id: r.id, patientId: r.patient_id, doctorId: r.doctor_id, status: r.status, createdAt: r.created_at,
      }));

      const isReviewed = reviewNotes.length > 0;
      const triageToUse = triageList[0] ?? null;

      const timeline: TimelineItem[] = [
        ...triageList.map((t) => ({
          id: `t-${t.id}`, kind: "triage" as const, title: `AI triage · ${t.severity}`,
          detail: t.summary, timestamp: t.createdAt, severity: t.severity,
        })),
        ...realNotes.map((n) => ({
          id: `n-${n.id}`, kind: "note" as const, title: "Doctor note",
          detail: n.transcript ?? "(no transcript)", timestamp: "",
        })),
        ...reviewNotes.map((r) => ({
          id: `rv-${r.id}`, kind: "review" as const, title: "Patient Reviewed",
          detail: (r.transcript ?? "").replace(REVIEW_MARKER, "").trim() || "Reviewed by clinical team",
          timestamp: "",
        })),
        ...prescriptions.map((r) => ({
          id: `rx-${r.id}`, kind: "prescription" as const,
          title: `Prescription · ${r.status ?? "pending"}`,
          detail: "Issued", timestamp: r.createdAt,
        })),
      ].sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));

      setData({ triage: triageToUse, notes: realNotes, prescriptions, timeline, isReviewed });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId, version]);

  return { data, loading, error, refetch: () => setVersion((v) => v + 1) };
}

export async function addPatientNote(patientId: string, transcript: string): Promise<void> {
  const { error } = await supabase.from("voice_notes").insert({ patient_id: patientId, transcript });
  if (error) throw error;
}

/**
 * Marks a patient as reviewed by:
 * 1. Inserting a sentinel voice_note (with REVIEW_MARKER prefix) to log the event in the timeline
 * 2. Upserting the priority_score to 35 so the patient leaves the high-risk queue
 * 3. Auto-dismissing all unread notifications that mention this patient by name
 *
 * We deliberately avoid inserting into `prescriptions` because that table has a strict
 * prescription_status enum that doesn't include "reviewed".
 */
export async function createCareAction(
  patientId: string,
  _doctorIdHint: string | null,
  _status: string,
  patientName?: string,
): Promise<void> {
  // Resolve doctor name for the audit trail (best-effort, non-fatal)
  let doctorName = "clinical team";
  const { data: doc } = await supabase.from("doctors").select("name").limit(1).maybeSingle();
  if (doc?.name) doctorName = doc.name;

  const reviewedAt = new Date().toLocaleString();
  const transcript = `${REVIEW_MARKER} Reviewed by ${doctorName} on ${reviewedAt}`;

  // Log the review event using voice_notes (plain text — no enum constraints)
  const { error: noteErr } = await supabase
    .from("voice_notes")
    .insert({ patient_id: patientId, transcript });
  if (noteErr) throw new Error(`Failed to log review: ${noteErr.message}`);

  // Move patient to stable by dropping their priority score to 35
  const { error: scoreErr } = await supabase
    .from("priority_scores")
    .upsert(
      { patient_id: patientId, score: 35, updated_at: new Date().toISOString() },
      { onConflict: "patient_id" }
    );
  if (scoreErr) {
    console.warn("[createCareAction] Priority score upsert failed:", scoreErr.message);
  }

  // Auto-dismiss all unread notifications that mention this patient
  // Notifications are seeded as "Patient Name: message..." so we match on the name prefix
  if (patientName) {
    const now = new Date().toISOString();

    // Fetch unread notifications whose message starts with the patient's name
    const { data: matching } = await supabase
      .from("notifications")
      .select("id")
      .is("read_at", null)
      .ilike("message", `${patientName}%`);

    if (matching && matching.length > 0) {
      const ids = matching.map((n: { id: string }) => n.id);
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .in("id", ids);
    }
  }
}
