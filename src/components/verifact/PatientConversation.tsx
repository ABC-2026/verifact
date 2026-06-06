import { useState } from "react";
import { MessageSquare, Plus, Send, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useMessages } from "@/lib/hooks/useMessages";
import type { Conversation, Message } from "@/lib/verifact-data";

interface PatientConversationProps {
  /** The patient's ID (used as sender_id and to load their conversations). */
  patientId: string;
  patientName: string;
  /** Pre-loaded conversations for this patient (filtered to this patient). */
  conversations: Conversation[];
  doctorId: string;
  doctorName: string;
  onConversationCreated?: () => void;
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function ConvThread({
  conversation,
  patientId,
  patientName,
  doctorName,
}: {
  conversation: Conversation;
  patientId: string;
  patientName: string;
  doctorName: string;
}) {
  const { data: messages, loading, sendMessage } = useMessages(conversation.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    await sendMessage({
      senderId: patientId,
      senderType: "patient",
      message: draft,
      patientName,
      doctorName,
    });
    setDraft("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {!loading && (messages ?? []).length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            No messages yet. Start the conversation below.
          </p>
        )}
        {!loading &&
          (messages ?? []).map((msg: Message) => {
            const isPatient = msg.senderType === "patient";
            return (
              <div
                key={msg.id}
                className={cn("flex flex-col gap-1", isPatient ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    isPatient
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  )}
                >
                  {msg.message}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                  {isPatient ? "You" : doctorName} · {fmt(msg.createdAt)}
                </span>
              </div>
            );
          })}
      </div>

      {conversation.status === "resolved" ? (
        <div className="px-4 py-2 text-xs text-center text-muted-foreground border-t border-border">
          This conversation has been resolved by your doctor.
        </div>
      ) : (
        <div className="flex items-end gap-2 border-t border-border px-4 py-3">
          <textarea
            id={`patient-msg-input-${conversation.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {sending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function PatientConversation({
  patientId,
  patientName,
  conversations,
  doctorId,
  doctorName,
  onConversationCreated,
}: PatientConversationProps) {
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [creating, setCreating] = useState(false);
  const [newMsg, setNewMsg] = useState("");

  const handleCreateConversation = async () => {
    if (!newMsg.trim()) return;
    setCreating(true);

    // Create conversation
    const { data: convData, error: convErr } = await supabase
      .from("conversations")
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (convErr || !convData) {
      console.error("[PatientConversation] create error:", convErr?.message);
      setCreating(false);
      return;
    }

    // Send first message
    await supabase.from("messages").insert({
      conversation_id: convData.id,
      sender_type: "patient",
      sender_id: patientId,
      message: newMsg.trim(),
      is_read: false,
    });

    // Notify doctor
    await supabase.from("notifications").insert({
      message: `${patientName} started a new conversation with you.`,
      created_at: new Date().toISOString(),
      read_at: null,
    });

    setNewMsg("");
    setCreating(false);
    onConversationCreated?.();
  };

  // Show new conversation form
  const [showNew, setShowNew] = useState(false);

  if (selectedConv) {
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => setSelectedConv(null)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-b border-border"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to conversations
        </button>
        <ConvThread
          conversation={selectedConv}
          patientId={patientId}
          patientName={patientName}
          doctorName={doctorName}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="h-4 w-4 text-primary" />
          Messages
        </div>
        <button
          id="patient-new-conversation"
          onClick={() => setShowNew(!showNew)}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {/* New conversation form */}
      {showNew && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">Start a new conversation</p>
          <textarea
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder="What would you like to ask your doctor?"
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowNew(false); setNewMsg(""); }}
              className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateConversation}
              disabled={!newMsg.trim() || creating}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          No conversations yet. Start one above to message your doctor.
        </div>
      ) : (
        <div className="space-y-1.5">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConv(conv)}
              className="w-full text-left rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{doctorName}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                    conv.status === "open"
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {conv.status}
                </span>
              </div>
              {conv.lastMessage && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {conv.lastMessage}
                </p>
              )}
              {conv.unreadCount > 0 && (
                <span className="mt-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {conv.unreadCount} new
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
