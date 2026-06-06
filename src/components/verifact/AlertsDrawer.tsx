import { X, BellOff, Info, CheckCircle2, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { usePatients } from "@/lib/hooks/usePatients";
import { useNavigate } from "@tanstack/react-router";

interface Props { open: boolean; onClose: () => void; }

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export function AlertsDrawer({ open, onClose }: Props) {
  const { data, loading, error, markAsRead, markAllAsRead } = useAlerts();
  const { data: patients } = usePatients();
  const navigate = useNavigate();
  const unread = (data ?? []).filter((a) => !a.readAt);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full sm:max-w-md flex-col bg-background shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 h-16 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Alerts</h2>
            <p className="text-xs text-muted-foreground">
              {unread.length} unread · {data?.length ?? 0} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-secondary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-5 text-sm text-destructive">{error}</div>
          )}

          {!loading && !error && (data?.length ?? 0) === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <BellOff className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">No active alerts</h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                New notifications from your patients will appear here in real time.
              </p>
            </div>
          )}

          {!loading && !error && (data?.length ?? 0) > 0 && (
            <div className="divide-y divide-border">
              {(data ?? []).map((a) => {
                const isRead = !!a.readAt;
                const patientMatch = (patients ?? []).find(p => a.message.includes(p.name));
                const hasLink = !!patientMatch;
                const isMessageAlert = patientMatch && (
                  a.message.toLowerCase().includes("message") ||
                  a.message.toLowerCase().includes("conversation") ||
                  a.message.toLowerCase().includes("replied") ||
                  a.message.toLowerCase().includes("sent you a")
                );

                const handleAlertClick = () => {
                  if (!patientMatch) return;
                  onClose();

                  const lower = a.message.toLowerCase();
                  if (isMessageAlert) {
                    navigate({ to: "/messages", search: { patientId: patientMatch.id } });
                    return;
                  }

                  // Check if it's a risk event
                  const isRiskEvent = lower.includes("spiked") ||
                                      lower.includes("dropped") ||
                                      lower.includes("exacerbation") ||
                                      lower.includes("elevated") ||
                                      lower.includes("spikes") ||
                                      lower.includes("flare") ||
                                      lower.includes("hypertensive") ||
                                      lower.includes("bp reading") ||
                                      lower.includes("egfr") ||
                                      lower.includes("hba1c") ||
                                      lower.includes("glucose") ||
                                      lower.includes("blood pressure") ||
                                      lower.includes("spo₂");

                  const highlight = lower.includes("glucose") || lower.includes("hba1c")
                    ? "clinical-summary"
                    : lower.includes("pressure") || lower.includes("bp") || lower.includes("hypertensive")
                    ? "clinical-summary"
                    : lower.includes("weight") || lower.includes("fluid")
                    ? "clinical-summary"
                    : lower.includes("spo₂") || lower.includes("respir") || lower.includes("asthma") || lower.includes("copd")
                    ? "clinical-summary"
                    : lower.includes("medication") || lower.includes("statin") || lower.includes("adherence") || lower.includes("refill")
                    ? "prescriptions"
                    : lower.includes("survey") || lower.includes("skipped") || lower.includes("weekly")
                    ? "timeline"
                    : "clinical-summary";

                  navigate({
                    to: "/",
                    search: {
                      patientId: patientMatch.id,
                      highlight,
                      scrollTo: isRiskEvent ? "clinical-summary" : undefined,
                    },
                  });
                };

                return (
                  <div
                    key={a.id}
                    onClick={hasLink ? handleAlertClick : undefined}
                    className={cn(
                      "group px-5 py-4 transition-colors",
                      hasLink ? "cursor-pointer hover:bg-secondary/40" : "",
                      isRead ? "opacity-60" : "bg-primary/[0.03] hover:bg-primary/[0.06]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                          isRead
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        <Info className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground leading-snug">{a.message}</p>
                        {patientMatch && (
                          <div className="mt-1.5 flex gap-2">
                            {isMessageAlert ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAlertClick();
                                }}
                                className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                              >
                                Open Conversation
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAlertClick();
                                }}
                                className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                              >
                                View Patient
                              </button>
                            )}
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">{fmt(a.createdAt)}</span>
                          {isRead ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3" />
                              Read
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                New
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(a.id);
                                }}
                                className="text-[11px] font-medium text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Mark read
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
