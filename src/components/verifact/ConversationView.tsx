import { useEffect, useRef, useState } from "react";
import { Send, CheckCircle2, RotateCcw, MessageSquare, AlertTriangle, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/verifact-data";
import { useMessages } from "@/lib/hooks/useMessages";
import type { Doctor } from "@/lib/hooks/useCurrentDoctor";

interface ConversationViewProps {
  conversation: Conversation | null;
  doctor: Doctor | null;
  onStatusChange: (convId: string, status: "open" | "resolved") => Promise<void>;
  onBack?: () => void;
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }) + " · " + new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function riskBadge(score: number) {
  if (score >= 75) return "bg-destructive/10 text-destructive";
  if (score >= 50) return "bg-warning/15 text-warning-foreground";
  return "bg-success/10 text-success";
}

function riskLabel(score: number) {
  if (score >= 75) return "High Risk";
  if (score >= 50) return "Moderate";
  return "Stable";
}

export function ConversationView({ conversation, doctor, onStatusChange, onBack }: ConversationViewProps) {
  const { data: messages, loading, sendMessage, markRead } = useMessages(
    conversation?.id ?? null
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversation?.id && messages && messages.some((m) => !m.isRead)) {
      void markRead();
    }
  }, [conversation?.id, messages, markRead]);

  const handleSend = async () => {
    if (!draft.trim() || !doctor || !conversation) return;
    setSending(true);
    await sendMessage({
      senderId: doctor.id,
      senderType: "doctor",
      message: draft,
      patientName: conversation.patientName,
      doctorName: doctor.name,
    });
    setDraft("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleStatusToggle = async () => {
    if (!conversation) return;
    setStatusLoading(true);
    const next = conversation.status === "open" ? "resolved" : "open";
    await onStatusChange(conversation.id, next);
    setStatusLoading(false);
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Select a conversation</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          Choose a conversation from the list, or click <span className="font-medium text-primary">+ New</span> to message a patient.
        </p>
      </div>
    );
  }

  const isResolved = conversation.status === "resolved";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Conversation header */}
      <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="mr-1 flex md:hidden h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-muted transition-colors"
              aria-label="Back to conversations"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {conversation.patientName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {conversation.patientName}
              </span>
              {conversation.riskScore >= 75 && (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
              )}
            </div>
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                riskBadge(conversation.riskScore)
              )}
            >
              {riskLabel(conversation.riskScore)} · Score {conversation.riskScore}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status badge */}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
              isResolved
                ? "bg-muted text-muted-foreground"
                : "bg-success/10 text-success"
            )}
          >
            {conversation.status}
          </span>

          {/* Toggle resolved/open */}
          <button
            id={`conv-status-toggle-${conversation.id}`}
            onClick={handleStatusToggle}
            disabled={statusLoading}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
              isResolved
                ? "border border-input bg-background hover:bg-secondary text-foreground"
                : "border border-input bg-background hover:bg-secondary text-foreground"
            )}
          >
            {isResolved ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                Reopen
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolve
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-background/50">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-12 w-2/3 animate-pulse rounded-xl bg-muted",
                  i % 2 === 0 ? "ml-0" : "ml-auto"
                )}
              />
            ))}
          </div>
        )}

        {!loading && messages?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">No messages yet. Send one to get started.</p>
          </div>
        )}

        {!loading &&
          messages?.map((msg) => {
            const isDoctor = msg.senderType === "doctor";
            return (
              <div
                key={msg.id}
                className={cn("flex flex-col gap-1", isDoctor ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                    isDoctor
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  )}
                >
                  {msg.message}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                  {isDoctor ? "You" : conversation.patientName} · {fmt(msg.createdAt)}
                  {isDoctor && !msg.isRead && (
                    <span className="ml-1 opacity-60">· Unread</span>
                  )}
                </span>
              </div>
            );
          })}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card px-4 py-3">
        {isResolved ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            This conversation is resolved. Reopen it to send messages.
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <textarea
              id={`msg-input-${conversation.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Ctrl+Enter to send)"
              rows={2}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              id={`msg-send-${conversation.id}`}
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
