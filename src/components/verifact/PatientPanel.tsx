import { useEffect, useState } from "react";
import { X, FileText, Activity, ShieldCheck, CheckCircle2, Stethoscope, Calendar, StickyNote, ClipboardCheck, Loader2, BadgeCheck, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Patient, RiskLevel } from "@/lib/verifact-data";
import { severityFromScore } from "@/lib/verifact-data";
import { usePatientIntelligence, createCareAction } from "@/lib/hooks/usePatientIntelligence";
import { useCurrentDoctor } from "@/lib/hooks/useCurrentDoctor";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { AddNoteDialog } from "@/components/verifact/AddNoteDialog";

interface Props {
  patient: Patient | null;
  open: boolean;
  onClose: () => void;
  onAddNote?: () => void;
  onReviewed?: () => void;
}

function riskMeta(level: RiskLevel) {
  if (level === "high") return { label: "High Risk", ring: "ring-destructive/30", text: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive" };
  if (level === "moderate") return { label: "Moderate Risk", ring: "ring-warning/40", text: "text-warning-foreground", bg: "bg-warning/15", dot: "bg-warning" };
  return { label: "Stable", ring: "ring-success/30", text: "text-success", bg: "bg-success/10", dot: "bg-success" };
}

const timelineIcon = {
  triage: Activity,
  note: StickyNote,
  prescription: FileText,
  review: BadgeCheck,
} as const;

const timelineTone = {
  triage: "bg-warning/15 text-warning-foreground",
  note: "bg-muted text-muted-foreground",
  prescription: "bg-primary/10 text-primary",
  review: "bg-success/10 text-success",
} as const;

function fmt(iso: string | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export function PatientPanel({ patient, open, onClose, onAddNote, onReviewed }: Props) {
  const { data: intel, loading, error, refetch } = usePatientIntelligence(open ? patient?.id ?? null : null);
  const doctor = useCurrentDoctor();
  const navigate = useNavigate();
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  const searchParams = useSearch({ strict: false }) as any;
  const highlight = searchParams?.highlight;
  const scrollTo = searchParams?.scrollTo;

  useEffect(() => { if (!open) { setReviewing(false); setReviewError(null); } }, [open]);

  useEffect(() => {
    if (open && patient && scrollTo) {
      const timer = setTimeout(() => {
        const targetId = scrollTo === "clinical-summary" ? "clinical-summary-section" : `${scrollTo}-section`;
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [open, patient, scrollTo]);

  const severity: RiskLevel = intel?.triage?.severity ?? (patient ? severityFromScore(patient.riskScore) : "low");
  const risk = riskMeta(severity);

  async function markReviewed() {
    if (!patient) return;
    setReviewError(null);
    try {
      setReviewing(true);
      await createCareAction(patient.id, doctor?.id ?? null, "reviewed", patient.name);
      refetch();
      onReviewed?.();
      toast.success(`${patient.name} marked as reviewed`);
    } catch (err) {
      console.error("[PatientPanel] Failed to mark reviewed:", err);
      setReviewError(err instanceof Error ? err.message : "Failed to save review. Please try again.");
    } finally {
      setReviewing(false);
    }
  }

  return (
    <>
      <div className={cn("fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")} onClick={onClose} />
      <aside className={cn("fixed right-0 top-0 z-50 flex h-full w-full sm:max-w-[42vw] sm:min-w-[420px] flex-col bg-background shadow-2xl transition-transform duration-300 ease-out", open ? "translate-x-0" : "translate-x-full")} aria-hidden={!open}>
        {!patient ? (
          <EmptyState onClose={onClose} />
        ) : (
          <>
            <div className="border-b border-border px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {patient.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground truncate">{patient.name}</h2>
                      <span className="text-xs text-muted-foreground">· MRN-{patient.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {patient.age} yrs{patient.phone ? ` · ${patient.phone}` : ""}{patient.createdAt ? ` · Enrolled ${new Date(patient.createdAt).toLocaleDateString()}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {patient.conditions.map((c) => (
                        <span key={c} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-secondary" aria-label="Close"><X className="h-4 w-4" /></button>
              </div>

              <div className={cn("mt-4 flex items-center justify-between gap-3 rounded-lg p-3 ring-1 ring-inset", risk.bg, risk.ring)}>
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", risk.dot)} />
                    <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", risk.dot)} />
                  </span>
                  <div>
                    <div className={cn("text-sm font-semibold", risk.text)}>{risk.label}</div>
                    <div className="text-[11px] text-muted-foreground">Composite triage score</div>
                  </div>
                </div>
                <div className={cn("text-3xl font-semibold tabular-nums", risk.text)}>{patient.riskScore}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 animate-fade-in">
              {loading ? <PanelSkeleton /> : error ? (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              ) : (
                <>
                  <section id="clinical-summary-section" className="space-y-2">
                    <SectionHeader icon={Stethoscope} title="Clinical Intelligence Summary" hint={intel?.triage ? `Updated ${fmt(intel.triage.createdAt)}` : undefined} />
                    <div className={cn(
                      "rounded-xl border p-4 transition-all duration-500",
                      highlight === "clinical-summary"
                        ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        : "border-border bg-card shadow-[var(--shadow-card)]"
                    )}>
                      {intel?.triage?.summary ? (
                        <p className="text-sm leading-relaxed text-foreground/90">{intel.triage.summary}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No AI summary recorded yet for this patient.</p>
                      )}
                    </div>
                  </section>

                  <section id="reasoning-section" className="space-y-2">
                    <SectionHeader icon={ShieldCheck} title="Reasoning" />
                    <div className={cn(
                      "rounded-xl border p-4 transition-all duration-500",
                      highlight === "reasoning"
                        ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        : "border-border bg-card"
                    )}>
                      {intel?.triage?.reasoning ? (
                        <p className="text-sm leading-relaxed text-foreground/90">{intel.triage.reasoning}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No reasoning recorded.</p>
                      )}
                    </div>
                  </section>

                  <section id="prescriptions-section" className="space-y-2">
                    <SectionHeader icon={ClipboardCheck} title="Prescriptions" hint={`${intel?.prescriptions.filter((r) => r.status !== "reviewed").length ?? 0} on file`} />
                    <div className={cn(
                      "rounded-xl border p-4 transition-all duration-500",
                      highlight === "prescriptions"
                        ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        : "border-border bg-card"
                    )}>
                      {(intel?.prescriptions.filter((r) => r.status !== "reviewed").length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">No prescriptions recorded.</p>
                      ) : (
                        <ul className="space-y-2">
                          {intel!.prescriptions.filter((r) => r.status !== "reviewed").map((r) => (
                            <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-3 text-sm">
                              <span className="font-medium text-foreground capitalize">{r.status ?? "pending"}</span>
                              <span className="text-xs text-muted-foreground">{fmt(r.createdAt)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>

                  <section id="timeline-section" className="space-y-2">
                    <SectionHeader icon={Calendar} title="Patient Timeline" hint={`${intel?.timeline.length ?? 0} events`} />
                    <div className={cn(
                      "rounded-xl border p-4 transition-all duration-500",
                      highlight === "timeline"
                        ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        : "border-border bg-card"
                    )}>
                      {(intel?.timeline.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity yet.</p>
                      ) : (
                        <ol className="relative ml-2 border-l border-border pl-5 space-y-4">
                          {intel!.timeline.map((e) => {
                            const Icon = timelineIcon[e.kind];
                            return (
                              <li key={e.id} className="relative">
                                <span className={cn("absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background", timelineTone[e.kind])}>
                                  <Icon className="h-3 w-3" />
                                </span>
                                <div className="flex items-baseline justify-between gap-2">
                                  <div className="text-sm font-medium text-foreground">{e.title}</div>
                                  <div className="text-[11px] text-muted-foreground shrink-0">{e.timestamp ? fmt(e.timestamp) : ""}</div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>

            <div className="border-t border-border bg-card/50 px-6 py-4">
              {reviewError && (
                <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center justify-between gap-2">
                  <span>{reviewError}</span>
                  <button onClick={() => setReviewError(null)} className="shrink-0 font-medium hover:underline">Dismiss</button>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">Close Panel</button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      navigate({ to: "/messages", search: { patientId: patient.id } });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    <MessageSquare className="h-4 w-4" /> Message Patient
                  </button>
                  <button onClick={() => setNoteOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                    <StickyNote className="h-4 w-4" /> Add Note
                  </button>
                  <button
                    onClick={markReviewed}
                    disabled={reviewing || !!intel?.isReviewed}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[image:var(--gradient-primary)] px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50 disabled:cursor-default"
                  >
                    {reviewing
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : intel?.isReviewed
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <CheckCircle2 className="h-4 w-4" />
                    }
                    {intel?.isReviewed ? "Reviewed" : "Mark Reviewed"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
      <AddNoteDialog
        open={noteOpen}
        patientId={patient?.id ?? null}
        onClose={() => setNoteOpen(false)}
        onSaved={() => refetch()}
      />
    </>
  );
}

function SectionHeader({ icon: Icon, title, hint }: { icon: typeof Stethoscope; title: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">{title}</h3></div>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><div className="h-4 w-48 rounded bg-muted animate-pulse" /><div className="h-24 rounded-xl bg-muted animate-pulse" /></div>
      <div className="space-y-2"><div className="h-4 w-32 rounded bg-muted animate-pulse" /><div className="h-20 rounded-xl bg-muted animate-pulse" /></div>
      <div className="space-y-2"><div className="h-4 w-36 rounded bg-muted animate-pulse" />{[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
    </div>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b border-border px-6 h-16">
        <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Stethoscope className="h-7 w-7" /></div>
        <h3 className="mt-4 text-base font-semibold text-foreground">No patient selected</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">Select a patient to view clinical intelligence.</p>
      </div>
    </div>
  );
}
