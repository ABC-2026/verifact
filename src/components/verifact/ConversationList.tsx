import { useState, useMemo, useEffect } from "react";
import { Search, MessageSquare, AlertTriangle, Plus, X, Send, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationStatus } from "@/lib/verifact-data";
import type { Patient } from "@/lib/verifact-data";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  error?: string | null;
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
  /** Available patients for starting new conversations */
  patients: Patient[];
  /** Called when doctor starts a new conversation */
  onNewConversation: (patientId: string, firstMessage: string) => Promise<void>;
  /** Whether new conversation is being created */
  creating?: boolean;
  defaultPatientId?: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function riskLabel(score: number): { label: string; cls: string } {
  if (score >= 75) return { label: "High", cls: "bg-destructive/10 text-destructive" };
  if (score >= 50) return { label: "Mod", cls: "bg-warning/15 text-warning-foreground" };
  return { label: "Low", cls: "bg-success/10 text-success" };
}

export function ConversationList({
  conversations,
  loading,
  error,
  selectedId,
  onSelect,
  patients,
  onNewConversation,
  creating = false,
  defaultPatientId = null,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationStatus>("open");
  const [showNew, setShowNew] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (defaultPatientId && !selectedId) {
      setShowNew(true);
      setNewPatientId(defaultPatientId);
    }
  }, [defaultPatientId, selectedId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      const matchSearch = !q || c.patientName.toLowerCase().includes(q);
      const matchFilter = c.status === filter;
      return matchSearch && matchFilter;
    });
  }, [conversations, search, filter]);

  const handleCreate = async () => {
    if (!newPatientId || !newMessage.trim()) return;
    await onNewConversation(newPatientId, newMessage);
    setShowNew(false);
    setNewPatientId("");
    setNewMessage("");
  };

  return (
    <aside className="flex flex-col w-full h-full border-r border-border bg-card">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Conversations</h3>
          <button
            id="new-conversation-btn"
            onClick={() => setShowNew(!showNew)}
            title="Start a new conversation"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              showNew
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {showNew ? (
              <><X className="h-3.5 w-3.5" /> Cancel</>
            ) : (
              <><Plus className="h-3.5 w-3.5" /> New</>
            )}
          </button>
        </div>

        {/* New conversation form */}
        {showNew && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Start a new conversation</p>

            {/* Patient selector */}
            <div className="relative">
              <select
                id="new-conv-patient-select"
                value={newPatientId}
                onChange={(e) => setNewPatientId(e.target.value)}
                className="w-full appearance-none rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Risk {p.riskScore}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* First message */}
            <textarea
              id="new-conv-message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your first message…"
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />

            <div className="flex justify-end">
              <button
                id="new-conv-send-btn"
                onClick={handleCreate}
                disabled={!newPatientId || !newMessage.trim() || creating}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                {creating ? "Creating…" : "Send"}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="conv-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient…"
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          {(["open", "resolved"] as ConversationStatus[]).map((s) => (
            <button
              key={s}
              id={`conv-filter-${s}`}
              onClick={() => setFilter(s)}
              className={cn(
                "flex-1 rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                filter === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
              {s === "open" && conversations.filter(c => c.status === "open").length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[9px] font-semibold text-primary">
                  {conversations.filter(c => c.status === "open").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {/* Error state */}
        {error && (
          <div className="m-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            <p className="font-medium">Could not load conversations</p>
            <p className="mt-0.5 opacity-80">{error}</p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !error && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}

        {/* Empty state — no conversations at all */}
        {!loading && !error && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquare className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No conversations yet</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
                Click <span className="font-medium text-primary">+ New</span> above to send your first message to a patient.
              </p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Start conversation
            </button>
          </div>
        )}

        {/* Empty state — filter has no results but conversations exist */}
        {!loading && !error && conversations.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {search ? "No results found" : `No ${filter} conversations`}
            </p>
            <p className="text-xs text-muted-foreground">
              {search
                ? "Try a different patient name"
                : filter === "resolved"
                ? "Mark a conversation as resolved to see it here."
                : "All conversations are resolved."}
            </p>
          </div>
        )}

        {/* Conversation rows */}
        {!loading &&
          !error &&
          filtered.map((conv) => {
            const risk = riskLabel(conv.riskScore);
            const isSelected = conv.id === selectedId;
            const isHighRisk = conv.riskScore >= 75;

            return (
              <button
                key={conv.id}
                id={`conv-item-${conv.id}`}
                onClick={() => onSelect(conv)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 last:border-0",
                  isSelected
                    ? "bg-primary/[0.08] border-l-2 border-l-primary"
                    : "hover:bg-muted/60"
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {conv.patientName.charAt(0)}
                  {isHighRisk && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-destructive">
                      <AlertTriangle className="h-2 w-2 text-white" />
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {conv.patientName}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                      {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ""}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.lastMessage ?? "No messages yet"}
                    </p>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", risk.cls)}>
                        {risk.label}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </aside>
  );
}
