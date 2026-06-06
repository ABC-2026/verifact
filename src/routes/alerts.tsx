import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar } from "@/components/verifact/Sidebar";
import { Topbar } from "@/components/verifact/Topbar";
import { AlertsDrawer } from "@/components/verifact/AlertsDrawer";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import { usePatients } from "@/lib/hooks/usePatients";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCircle2, AlertCircle, Info, CheckCheck } from "lucide-react";
import { useCurrentDoctor } from "@/lib/hooks/useCurrentDoctor";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Verifact" },
    ],
  }),
  component: AlertsPage,
});

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function severityIcon(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("urgent") || lower.includes("critical") || lower.includes("high")) {
    return <AlertCircle className="h-5 w-5 text-destructive" />;
  }
  return <Info className="h-5 w-5" />;
}

function severityBg(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("urgent") || lower.includes("critical") || lower.includes("high")) {
    return "bg-destructive/10 text-destructive";
  }
  return "bg-primary/10 text-primary";
}

function AlertsPage() {
  const navigate = useNavigate();
  const { data: alerts, loading, error, markAsRead, markAllAsRead } = useAlerts();
  const { data: patients } = usePatients();
  const metrics = useDashboardMetrics(patients);
  const doctor = useCurrentDoctor();
  const { totalUnread } = useUnreadMessages(doctor?.id ?? null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const unreadAlerts = (alerts ?? []).filter((a) => !a.readAt).length;
  const displayAlerts = alerts ?? [];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        urgentCount={metrics.highRisk}
        alertCount={unreadAlerts}
        messagesCount={totalUnread}
        onOpenAlerts={() => setDrawerOpen(true)}
        onNavigate={(label) => {
          if (label === "Patients") navigate({ to: "/patients" });
        }}
        className="hidden lg:flex"
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          title="Alerts"
          onOpenAlerts={() => setDrawerOpen(true)}
          alertCount={unreadAlerts}
          urgentCount={metrics.highRisk}
          onNavigate={(label) => {
            if (label === "Patients") navigate({ to: "/patients" });
          }}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">

            {/* Page header */}
            <section className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Alerts &amp; Notifications
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {unreadAlerts} unread · {displayAlerts.length} total
                </p>
              </div>
              {unreadAlerts > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all as read
                </button>
              )}
            </section>

            {/* Loading skeletons */}
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && displayAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bell className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">No active alerts</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  New notifications from your patients will appear here in real time.
                </p>
              </div>
            )}

            {/* Alert list */}
            {!loading && !error && displayAlerts.length > 0 && (
              <div className="space-y-2">
                {displayAlerts.map((a) => {
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
                      className={`group flex items-start gap-4 rounded-lg border bg-card p-4 transition-all ${
                        hasLink ? "cursor-pointer hover:bg-secondary/30 hover:border-primary/20" : ""
                      } ${
                        isRead
                          ? "border-border opacity-60"
                          : "border-border/60 ring-1 ring-primary/10 hover:ring-primary/20"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${severityBg(a.message)}`}
                      >
                        {severityIcon(a.message)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium leading-snug ${isRead ? "text-muted-foreground" : "text-foreground"}`}>
                          {a.message}
                        </p>
                        {patientMatch && (
                          <div className="mt-2">
                            {isMessageAlert ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAlertClick();
                                }}
                                className="inline-flex items-center gap-1 rounded bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                              >
                                Open Conversation
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAlertClick();
                                }}
                                className="inline-flex items-center gap-1 rounded bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                              >
                                View Patient
                              </button>
                            )}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">{fmt(a.createdAt)}</span>
                          <div className="flex items-center gap-2">
                            {!isRead && (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                New
                              </span>
                            )}
                            {isRead ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3" />
                                Read
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(a.id);
                                }}
                                className="text-[11px] font-medium text-primary hover:underline"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <footer className="pt-2 pb-6 text-center text-[11px] text-muted-foreground">
              Verifact Clinical Suite · HIPAA &amp; DPDP-A compliant
            </footer>
          </div>
        </main>
      </div>

      <AlertsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
