import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/verifact/Sidebar";
import { Topbar } from "@/components/verifact/Topbar";
import { MetricCard } from "@/components/verifact/MetricCard";
import { RiskDistributionChart } from "@/components/verifact/RiskDistributionChart";
import { ConditionDistributionChart } from "@/components/verifact/ConditionDistributionChart";
import { AlertsDrawer } from "@/components/verifact/AlertsDrawer";
import { usePatients } from "@/lib/hooks/usePatients";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { useNavigate } from "@tanstack/react-router";
import { Users, AlertTriangle, Activity, ListChecks, Download } from "lucide-react";
import { useCurrentDoctor } from "@/lib/hooks/useCurrentDoctor";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Verifact" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const navigate = useNavigate();
  const { data: patients, loading } = usePatients();
  const metrics = useDashboardMetrics(patients);
  const { data: alerts } = useAlerts();
  const doctor = useCurrentDoctor();
  const { totalUnread } = useUnreadMessages(doctor?.id ?? null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [rxLoading, setRxLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRx = async () => {
      setRxLoading(true);
      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select("id, status, created_at");
        if (error) {
          console.error("Error fetching prescriptions:", error.message);
        } else if (active && data) {
          setPrescriptions(data);
        }
      } catch (e) {
        console.error("Error:", e);
      } finally {
        if (active) setRxLoading(false);
      }
    };
    fetchRx();
    return () => { active = false; };
  }, []);

  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (patients ?? []).forEach((p) => {
      (p.conditions ?? []).forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) {
          counts[trimmed] = (counts[trimmed] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [patients]);

  const unreadAlerts = (alerts ?? []).filter((a) => !a.readAt).length;

  const handleExport = () => {
    // Simple CSV export for demo
    const csv = [
      ["Metric", "Value"],
      ["Total Monitored Patients", metrics.total],
      ["High Risk Patients", metrics.highRisk],
      ["Needs Review", metrics.needsReview],
      ["Stable", metrics.stable],
      ["Average Risk Score", metrics.avgScore],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verifact-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        urgentCount={metrics.highRisk}
        alertCount={unreadAlerts}
        messagesCount={totalUnread}
        onOpenAlerts={() => setDrawerOpen(true)}
        onNavigate={(label) => {
          if (label === "Patients") {
            navigate({ to: "/patients" });
          }
        }}
        className="hidden lg:flex"
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          title="Reports"
          onOpenAlerts={() => setDrawerOpen(true)}
          alertCount={unreadAlerts}
          urgentCount={metrics.highRisk}
          onNavigate={(label) => {
            if (label === "Patients") {
              navigate({ to: "/patients" });
            }
          }}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
            <section className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Reports & Analytics
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Patient cohort metrics and analytics.
                </p>
              </div>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Monitored Patients" value={metrics.total} delta="" trend="up" icon={Users} accent="primary" />
              <MetricCard label="High Risk Patients" value={metrics.highRisk} delta="" trend="up" goodWhen="down" icon={AlertTriangle} accent="destructive" />
              <MetricCard label="Needs Review" value={metrics.needsReview} delta="" trend="up" goodWhen="down" icon={ListChecks} accent="warning" />
              <MetricCard label="Average Risk Score" value={metrics.avgScore} delta="" trend="down" goodWhen="down" icon={Activity} accent="success" />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RiskDistributionChart metrics={metrics} loading={loading} />
              <ConditionDistributionChart data={conditionCounts} loading={loading} />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                <h3 className="text-base font-semibold text-foreground">Medication Adherence Summary</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Summary of patient prescription statuses live from Supabase</p>
                
                {rxLoading ? (
                  <div className="mt-6 h-32 animate-pulse rounded bg-muted" />
                ) : prescriptions.length === 0 ? (
                  <div className="mt-6 flex flex-col items-center justify-center p-6 text-center border border-dashed border-border rounded-lg bg-muted/20">
                    <p className="text-sm font-medium text-foreground">No prescription data available</p>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      Add prescriptions for patients via the Clinical Suite to populate this dashboard and monitor compliance.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center rounded-lg border border-border bg-muted/10 p-4">
                      <div className="text-3xl font-bold text-foreground">{prescriptions.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total Prescriptions</div>
                    </div>
                    <div className="text-center rounded-lg border border-border bg-muted/10 p-4">
                      <div className="text-3xl font-bold text-success">
                        {prescriptions.filter(p => p.status === 'active' || p.status === 'filled').length}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Active / Filled</div>
                    </div>
                    <div className="text-center rounded-lg border border-border bg-muted/10 p-4">
                      <div className="text-3xl font-bold text-warning">
                        {prescriptions.filter(p => p.status === 'pending' || !p.status).length}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Pending Review</div>
                    </div>
                    <div className="text-center rounded-lg border border-border bg-muted/10 p-4">
                      <div className="text-3xl font-bold text-muted-foreground">
                        {prescriptions.filter(p => p.status === 'discontinued').length}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Discontinued</div>
                    </div>
                  </div>
                )}
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
              </div>
            </section>

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

function Row({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  );
}
