import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

const POLL_INTERVAL_MS = 15_000;

export interface UnreadMessagesSummary {
  totalUnread: number;
  openConversations: number;
  hasHighRiskUnread: boolean;
}

export function useUnreadMessages(doctorId: string | null): UnreadMessagesSummary {
  const [summary, setSummary] = useState<UnreadMessagesSummary>({
    totalUnread: 0,
    openConversations: 0,
    hasHighRiskUnread: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (!doctorId) return;

    // Fetch open conversations with unread patient messages and risk scores
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `id, status,
         patients(priority_scores(score)),
         messages(is_read, sender_type)`
      )
      .eq("doctor_id", doctorId);

    if (error || !data) return;

    let totalUnread = 0;
    let openConversations = 0;
    let hasHighRiskUnread = false;

    for (const conv of data as {
      id: string;
      status: string;
      patients: { priority_scores: { score: number | null }[] | { score: number | null } | null } | null;
      messages: { is_read: boolean; sender_type: string }[];
    }[]) {
      if (conv.status === "open") openConversations++;

      const convUnread = (conv.messages ?? []).filter(
        (m) => !m.is_read && m.sender_type === "patient"
      ).length;
      totalUnread += convUnread;

      if (convUnread > 0) {
        const ps = Array.isArray(conv.patients?.priority_scores)
          ? conv.patients.priority_scores[0]
          : conv.patients?.priority_scores;
        const score = ps?.score ?? 0;
        if (score >= 75) hasHighRiskUnread = true;
      }
    }

    setSummary({ totalUnread, openConversations, hasHighRiskUnread });
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) return;
    void fetch();
    timerRef.current = setInterval(() => void fetch(), POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [doctorId, fetch]);

  return summary;
}
