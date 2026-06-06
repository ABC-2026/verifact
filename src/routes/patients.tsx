import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { Sidebar } from "@/components/verifact/Sidebar";
import { Topbar } from "@/components/verifact/Topbar";
import { PatientTable } from "@/components/verifact/PatientTable";
import { PatientPanel } from "@/components/verifact/PatientPanel";
import { PatientFormDialog } from "@/components/verifact/PatientFormDialog";
import { AlertsDrawer } from "@/components/verifact/AlertsDrawer";
import type { Patient } from "@/lib/verifact-data";
import { usePatients } from "@/lib/hooks/usePatients";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentDoctor } from "@/lib/hooks/useCurrentDoctor";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";

const patientsSearchSchema = z.object({
  patientId: z.string().optional(),
  highlight: z.string().optional(),
  scrollTo: z.string().optional(),
});

export const Route = createFileRoute("/patients")({
  validateSearch: patientsSearchSchema,
  head: () => ({
    meta: [
      { title: "Patients — Verifact" },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const patientId = searchParams.patientId;

  const { data: patients, loading, error, refetch } = usePatients();
  const metrics = useDashboardMetrics(patients);
  const { data: alerts, refetch: refetchAlerts } = useAlerts();
  const doctor = useCurrentDoctor();
  const { totalUnread } = useUnreadMessages(doctor?.id ?? null);

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
          if (label === "Patients") {
            // Already on Patients, scroll to queue
            const el = document.getElementById("priority-queue");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        className="hidden lg:flex"
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          title="Patients"
          onOpenAlerts={() => setDrawerOpen(true)}
          alertCount={unreadAlerts}
          onSearch={setSearch}
          searchValue={search}
          urgentCount={metrics.highRisk}
          onNavigate={(label) => {
            if (label === "Patients") {
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
                  Patient Registry
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage and monitor chronic-care patients. {metrics.total} patients total.
                </p>
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
