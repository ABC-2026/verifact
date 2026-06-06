import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Message } from "@/lib/verifact-data";

const POLL_INTERVAL_MS = 8_000;

interface MsgRow {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function mapRow(r: MsgRow): Message {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderType: r.sender_type as "doctor" | "patient",
    senderId: r.sender_id,
    message: r.message,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}

export function useMessages(conversationId: string | null) {
  const [data, setData] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (!conversationId) return;
    setError(null);

    console.log("[useMessages] fetching for conversationId:", conversationId);

    const { data: rows, error: err } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_type, sender_id, message, is_read, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    console.log("[useMessages] rows:", rows?.length ?? 0, "error:", err);

    if (err) {
      setError(err.message);
    } else {
      setData((rows as MsgRow[] | null ?? []).map(mapRow));
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setData(null);
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setLoading(true);
    setData(null);
    void fetch();

    timerRef.current = setInterval(() => void fetch(), POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [conversationId, fetch]);

  /** Send a message and create a notification. Returns true on success. */
  const sendMessage = useCallback(
    async (opts: {
      senderId: string;
      senderType: "doctor" | "patient";
      message: string;
      patientName?: string;
      doctorName?: string;
    }): Promise<boolean> => {
      const { senderId, senderType, message, patientName, doctorName } = opts;
      if (!conversationId || !message.trim()) return false;

      console.log("[useMessages] sendMessage:", { conversationId, senderType, message });

      // Insert message
      const { data: inserted, error: msgErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          sender_id: senderId,
          message: message.trim(),
          is_read: false,
        })
        .select("id")
        .single();

      if (msgErr) {
        console.error("[useMessages] sendMessage error:", msgErr.message);
        return false;
      }

      console.log("[useMessages] inserted message id:", inserted?.id);

      // Update conversation updated_at
      const { error: convErr } = await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      if (convErr) {
        console.error("[useMessages] conversation update error:", convErr.message);
      }

      // Create notification
      const notifMessage =
        senderType === "patient"
          ? `${patientName ?? "A patient"} sent you a message.`
          : `Dr. ${doctorName ?? "your doctor"} replied to ${patientName ?? "your conversation"}.`;

      const { error: notifErr } = await supabase.from("notifications").insert({
        message: notifMessage,
        created_at: new Date().toISOString(),
        read_at: null,
      });

      if (notifErr) {
        console.error("[useMessages] notification insert error:", notifErr.message);
      }

      // Immediately refresh messages
      await fetch();
      return true;
    },
    [conversationId, fetch]
  );

  /** Mark all unread messages in this conversation as read. */
  const markRead = useCallback(async () => {
    if (!conversationId) return;
    const { error: err } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("is_read", false);

    if (err) {
      console.error("[useMessages] markRead error:", err.message);
    } else {
      await fetch();
    }
  }, [conversationId, fetch]);

  return { data, loading, error, refetch: fetch, sendMessage, markRead };
}
