import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { Users, AlertTriangle, Activity, ListChecks, MessageSquare } from "lucide-react";
import { Sidebar } from "@/components/verifact/Sidebar";
import { Topbar } from "@/components/verifact/Topbar";
import { MetricCard } from "@/components/verifact/MetricCard";
import { PatientTable } from "@/components/verifact/PatientTable";
import { AlertsDrawer } from "@/components/verifact/AlertsDrawer";
import { RiskDistributionChart } from "@/components/verifact/RiskDistributionChart";
import { PatientPanel } from "@/components/verifact/PatientPanel";
import { PatientFormDialog } from "@/components/verifact/PatientFormDialog";
import type { Patient } from "@/lib/verifact-data";
import { usePatients } from "@/lib/hooks/usePatients";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { useCurrentDoctor } from "@/lib/hooks/useCurrentDoctor";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";

const dashboardSearchSchema = z.object({
  patientId: z.string().optional(),
  highlight: z.string().optional(),
  scrollTo: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: dashboardSearchSchema,
  head: () => ({
    meta: [
      { title: "Verifact — Clinical Dashboard" },
      { name: "description", content: "AI-powered chronic disease monitoring for Indian private hospitals." },
      { property: "og:title", content: "Verifact — Clinical Dashboard" },
      { property: "og:description", content: "Identify the patients who need attention — in 10 seconds." },
    ],
  }),
  component: Index,
});

function greetingFromHour(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Index() {
  const navigate = useNavigate();
  const { data: patients, loading, error, refetch } = usePatients();
  const metrics = useDashboardMetrics(patients);
  const { data: alerts, refetch: refetchAlerts } = useAlerts();
  const doctor = useCurrentDoctor();
  const { totalUnread, openConversations, hasHighRiskUnread } = useUnreadMessages(doctor?.id ?? null);

  const searchParams = Route.useSearch();
  const patientId = searchParams.patientId;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Auto-open patient drawer if patientId is in URL
  useEffect(() => {
    if (patientId && patients && patients.length > 0) {
      const match = patients.find((p) => p.id === patientId);
      if (match) {
        setSelectedPatient(match);
        setPanelOpen(true);
      }
    }
  }, [patientId, patients]);

  const unreadAlerts = (alerts ?? []).filter((a) => !a.readAt).length;

  const filteredPatients = useMemo(() => {
    if (!search) return patients ?? [];
    const q = search.toLowerCase();
    return (patients ?? []).filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const phoneMatch = p.phone?.toLowerCase().includes(q);
      const condMatch = p.conditions?.some((c) => c.toLowerCase().includes(q));
      return nameMatch || phoneMatch || condMatch;
    });
  }, [patients, search]);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        urgentCount={metrics.highRisk}
        alertCount={unreadAlerts}
        messagesCount={totalUnread}
        onOpenAlerts={() => setDrawerOpen(true)}
        onNavigate={(label) => {
          if (label === "Patients" || label === "Dashboard") {
            const el = document.getElementById("priority-queue");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        className="hidden lg:flex"
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          title="Dashboard"
          onOpenAlerts={() => setDrawerOpen(true)}
          alertCount={unreadAlerts}
          onSearch={setSearch}
          searchValue={search}
          urgentCount={metrics.highRisk}
          onNavigate={(label) => {
            if (label === "Patients" || label === "Dashboard") {
              const el = document.getElementById("priority-queue");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
            <section className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {greetingFromHour()}{doctor?.name ? `, ${doctor.name.split(" ").slice(-1)[0]}` : ""}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {metrics.highRisk > 0 ? (
                    <><span className="font-medium text-destructive">{metrics.highRisk} patient{metrics.highRisk === 1 ? "" : "s"}</span> require urgent attention.</>
                  ) : (
                    <>All monitored patients are stable.</>
                  )}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Monitored Patients" value={metrics.total} delta="" trend="up" icon={Users} accent="primary" />
              <MetricCard label="High Risk Patients" value={metrics.highRisk} delta="" trend="up" goodWhen="down" icon={AlertTriangle} accent="destructive" />
              <MetricCard label="Needs Review" value={metrics.needsReview} delta="" trend="up" goodWhen="down" icon={ListChecks} accent="warning" />
              <MetricCard label="Average Risk Score" value={metrics.avgScore} delta="" trend="down" goodWhen="down" icon={Activity} accent="success" />
            </section>

            {/* Unread Messages card + high-risk message indicator */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Unread Messages"
                value={totalUnread}
                delta={openConversations > 0 ? `${openConversations} open` : ""}
                trend={totalUnread > 0 ? "up" : "down"}
                goodWhen="down"
                icon={MessageSquare}
                accent="primary"
              />
              {hasHighRiskUnread && (
                <div className="sm:col-span-2 xl:col-span-2 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                  <p className="text-sm font-medium text-destructive">
                    A high-risk patient has sent you an unread message — check <Link to="/messages" className="underline cursor-pointer">Messages</Link> immediately.
                  </p>
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RiskDistributionChart metrics={metrics} loading={loading} />
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <h3 className="text-base font-semibold text-foreground">Cohort snapshot</h3>
                <p className="text-xs text-muted-foreground">Live from Supabase</p>
                <ul className="mt-4 space-y-3 text-sm">
                  <Row label="High risk" value={metrics.highRisk} />
                  <Row label="Needs review" value={metrics.needsReview} />
                  <Row label="Stable" value={metrics.stable} />
                  <Row label="Unread alerts" value={unreadAlerts} />
                </ul>
                {metrics.total === 0 && !loading && (
                  <div className="mt-5 rounded-lg bg-primary/5 p-3 text-xs text-primary">
                    <div className="font-semibold">Get started</div>
                    <p className="mt-0.5 text-foreground/80">No patients yet — click <span className="font-medium">Add patient</span> in the priority queue to enroll one.</p>
                  </div>
                )}
              </div>
            </section>

            <div id="priority-queue">
              <PatientTable
                patients={filteredPatients}
                loading={loading}
                error={error}
                onSelect={(p) => { setSelectedPatient(p); setPanelOpen(true); }}
                onEdit={(p) => { setEditing(p); setFormOpen(true); }}
                onAdd={() => { setEditing(null); setFormOpen(true); }}
              />
            </div>

            <footer className="pt-2 pb-6 text-center text-[11px] text-muted-foreground">
              Verifact Clinical Suite · HIPAA &amp; DPDP-A compliant
            </footer>
          </div>
        </main>
      </div>

      <AlertsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <PatientPanel
        patient={selectedPatient}
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          navigate({ search: {} });
        }}
        onReviewed={() => refetchAlerts()}
      />
      <PatientFormDialog
        open={formOpen}
        patient={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => refetch()}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  );
}
