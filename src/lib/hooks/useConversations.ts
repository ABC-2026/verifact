import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Conversation } from "@/lib/verifact-data";

const POLL_INTERVAL_MS = 15_000;

interface ConvRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  patients: {
    name: string;
    priority_scores: { score: number | null }[] | { score: number | null } | null;
  } | null;
  messages: { is_read: boolean; sender_type: string; created_at: string; message: string }[];
}

function mapRow(r: ConvRow): Conversation {
  const ps = Array.isArray(r.patients?.priority_scores)
    ? r.patients.priority_scores[0]
    : r.patients?.priority_scores;
  const riskScore = ps?.score ?? 0;

  // Only count unread messages FROM the patient (doctor reads these)
  const unreadCount = r.messages.filter((m) => !m.is_read && m.sender_type === "patient").length;

  // Last message details
  const sorted = [...r.messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const last = sorted[0];

  return {
    id: r.id,
    patientId: r.patient_id,
    doctorId: r.doctor_id,
    status: r.status as "open" | "resolved",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    patientName: r.patients?.name ?? "Unknown Patient",
    riskScore,
    unreadCount,
    lastMessage: last?.message ?? null,
    lastMessageAt: last?.created_at ?? null,
  };
}

export function useConversations(doctorId: string | null) {
  const [data, setData] = useState<Conversation[] | null>(null);
  // Start as false so we don't show a spinner when doctorId is still null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async (): Promise<Conversation[]> => {
    if (!doctorId) {
      // doctorId not available yet — show empty list, not spinner
      setData([]);
      setLoading(false);
      return [];
    }
    setError(null);

    // Log for debugging
    console.log("[useConversations] fetching for doctorId:", doctorId);

    const { data: rows, error: err } = await supabase
      .from("conversations")
      .select(
        `id, patient_id, doctor_id, status, created_at, updated_at,
         patients(name, priority_scores(score)),
         messages(is_read, sender_type, created_at, message)`
      )
      .eq("doctor_id", doctorId)
      .order("updated_at", { ascending: false });

    console.log("[useConversations] rows:", rows, "error:", err);

    let result: Conversation[] = [];
    if (err) {
      setError(err.message);
      setData([]);
    } else {
      result = (rows as ConvRow[] | null ?? []).map(mapRow);
      setData(result);
    }
    setLoading(false);
    return result;
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) {
      // Clear polling, reset to empty (not loading)
      if (timerRef.current) clearInterval(timerRef.current);
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetch();

    timerRef.current = setInterval(() => void fetch(), POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [doctorId, fetch]);

  /** Create a new conversation between the current doctor and a patient. */
  const createConversation = useCallback(
    async (patientId: string, firstMessage: string): Promise<string | null> => {
      if (!doctorId || !patientId || !firstMessage.trim()) return null;

      // Check if open conversation already exists for this patient+doctor pair
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("doctor_id", doctorId)
        .eq("patient_id", patientId)
        .eq("status", "open")
        .maybeSingle();

      let convId: string;

      if (existing?.id) {
        convId = existing.id;
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            patient_id: patientId,
            doctor_id: doctorId,
            status: "open",
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (convErr || !newConv) {
          console.error("[useConversations] createConversation error:", convErr?.message);
          return null;
        }
        convId = newConv.id;
      }

      // Insert first message
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_type: "doctor",
        sender_id: doctorId,
        message: firstMessage.trim(),
        is_read: false,
      });

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      await fetch();
      return convId;
    },
    [doctorId, fetch]
  );

  /** Mark a conversation resolved or reopen it. */
  const setStatus = useCallback(
    async (conversationId: string, status: "open" | "resolved") => {
      const { error: err } = await supabase
        .from("conversations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      if (err) {
        console.error("[useConversations] setStatus error:", err.message);
      } else {
        await fetch();
      }
    },
    [fetch]
  );

  return { data, loading, error, refetch: fetch, setStatus, createConversation };
}
