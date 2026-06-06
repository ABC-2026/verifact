import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar } from "@/components/verifact/Sidebar";
import { Topbar } from "@/components/verifact/Topbar";
import { AlertsDrawer } from "@/components/verifact/AlertsDrawer";
import { useCurrentDoctor } from "@/lib/hooks/useCurrentDoctor";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import { usePatients } from "@/lib/hooks/usePatients";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Lock, Eye, Save, AlertCircle } from "lucide-react";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Verifact" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const doctor = useCurrentDoctor();
  const { data: patients } = usePatients();
  const metrics = useDashboardMetrics(patients);
  const { data: alerts } = useAlerts();
  const { totalUnread } = useUnreadMessages(doctor?.id ?? null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [highRisk, setHighRisk] = useState(() => {
    try {
      return localStorage.getItem("pref_high_risk") !== "false";
    } catch { return true; }
  });
  const [needsReview, setNeedsReview] = useState(() => {
    try {
      return localStorage.getItem("pref_needs_review") !== "false";
    } catch { return true; }
  });
  const [dailySummary, setDailySummary] = useState(() => {
    try {
      return localStorage.getItem("pref_daily_summary") !== "false";
    } catch { return true; }
  });

  const unreadAlerts = (alerts ?? []).filter((a) => !a.readAt).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem("pref_high_risk", String(highRisk));
      localStorage.setItem("pref_needs_review", String(needsReview));
      localStorage.setItem("pref_daily_summary", String(dailySummary));
      await new Promise((r) => setTimeout(r, 400));
      toast.success("Notification preferences saved");
    } catch (e) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar
        urgentCount={metrics.highRisk}
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
          title="Settings"
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
          <div className="mx-auto max-w-2xl px-6 py-6 space-y-6">
            <section className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Settings & Preferences
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage your profile and notification preferences.
                </p>
              </div>
            </section>

            {/* Doctor Profile Section */}
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Doctor Profile</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={doctor?.name ?? ""}
                    className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    disabled
                    value={doctor?.phone ?? ""}
                    className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  />
                </div>

                <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-600">
                  <p className="font-medium">Profile is read-only</p>
                  <p className="text-xs mt-1">Contact your administrator to update profile information.</p>
                </div>
              </div>
            </section>

            {/* Notification Preferences */}
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highRisk}
                    onChange={(e) => setHighRisk(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-foreground">High Risk Alerts</div>
                    <div className="text-xs text-muted-foreground">Notify when a patient's risk score exceeds 75</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needsReview}
                    onChange={(e) => setNeedsReview(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-foreground">Needs Review Alerts</div>
                    <div className="text-xs text-muted-foreground">Notify when a patient's risk score is 50–74</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dailySummary}
                    onChange={(e) => setDailySummary(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-foreground">Daily Summary</div>
                    <div className="text-xs text-muted-foreground">Receive daily cohort summary at 8:00 AM</div>
                  </div>
                </label>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Preferences"}
              </button>
            </section>

            {/* Privacy & Security */}
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Privacy & Security</h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-foreground">Data Encryption</div>
                    <div className="text-xs text-muted-foreground">Patient data is encrypted in transit and at rest.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-foreground">HIPAA Compliant</div>
                    <div className="text-xs text-muted-foreground">Verifact adheres to HIPAA and DPDP-A regulations.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-foreground">Session Timeout</div>
                    <div className="text-xs text-muted-foreground">Your session will expire after 30 minutes of inactivity.</div>
                  </div>
                </div>
              </div>
            </section>

            {/* About */}
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">About</h3>

              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">1.0.0-MVP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Database</span>
                  <span className="font-medium">Supabase PostgreSQL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">2026-06-06</span>
                </div>
              </div>

              <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">MVP Preview</p>
                  <p className="text-xs mt-1">This is an early preview. Features may change based on user feedback.</p>
                </div>
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
