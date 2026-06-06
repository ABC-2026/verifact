import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { MessageSquare } from "lucide-react";
import { Sidebar } from "@/components/verifact/Sidebar";
import { Topbar } from "@/components/verifact/Topbar";
import { AlertsDrawer } from "@/components/verifact/AlertsDrawer";
import { ConversationList } from "@/components/verifact/ConversationList";
import { ConversationView } from "@/components/verifact/ConversationView";
import { useCurrentDoctor } from "@/lib/hooks/useCurrentDoctor";
import { useConversations } from "@/lib/hooks/useConversations";
import { useUnreadMessages } from "@/lib/hooks/useUnreadMessages";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";
import { usePatients } from "@/lib/hooks/usePatients";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { useNavigate } from "@tanstack/react-router";
import type { Conversation } from "@/lib/verifact-data";

const messagesSearchSchema = z.object({
  patientId: z.string().optional(),
});

export const Route = createFileRoute("/messages")({
  validateSearch: messagesSearchSchema,
  head: () => ({
    meta: [
      { title: "Messages — Verifact" },
      { name: "description", content: "Doctor-patient messaging for Verifact Clinical Suite." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const patientId = searchParams.patientId;

  const doctor = useCurrentDoctor();
  const { data: patients } = usePatients();
  const metrics = useDashboardMetrics(patients);
  const { data: alerts } = useAlerts();
  const {
    data: conversations,
    loading,
    error,
    refetch,
    setStatus,
    createConversation,
  } = useConversations(doctor?.id ?? null);
  const { totalUnread } = useUnreadMessages(doctor?.id ?? null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [creating, setCreating] = useState(false);

  // Auto-select conversation if patientId is provided in URL
  useEffect(() => {
    if (patientId && conversations && conversations.length > 0) {
      const match = conversations.find((c) => c.patientId === patientId);
      if (match) {
        setSelectedConv(match);
      }
    }
  }, [patientId, conversations]);

  const unreadAlerts = (alerts ?? []).filter((a) => !a.readAt).length;

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
  };

  const handleStatusChange = async (convId: string, status: "open" | "resolved") => {
    await setStatus(convId, status);
    await refetch();
    setSelectedConv((prev) => (prev?.id === convId ? { ...prev, status } : prev));
  };

  const handleNewConversation = async (pId: string, firstMessage: string) => {
    setCreating(true);
    const convId = await createConversation(pId, firstMessage);
    setCreating(false);
    if (convId) {
      const fresh = await refetch();
      const created = (fresh ?? []).find((c) => c.id === convId);
      if (created) {
        setSelectedConv(created);
        navigate({ to: "/messages", search: {} });
      }
    }
  };

  const doctorLoading = !doctor;

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
          title="Messages"
          onOpenAlerts={() => setDrawerOpen(true)}
          alertCount={unreadAlerts}
          urgentCount={metrics.highRisk}
          onNavigate={(label) => {
            if (label === "Patients") navigate({ to: "/patients" });
          }}
        />

        <main className="flex-1 overflow-hidden relative">
          {/* Doctor profile still loading */}
          {doctorLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-foreground">Loading doctor profile…</p>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Two-panel layout */
            <div className="flex h-full">
              {/* Left: conversation list — fixed width on desktop */}
              <div className="hidden md:flex md:w-72 lg:w-80 xl:w-96 h-full border-r border-border shrink-0">
                <ConversationList
                  conversations={conversations ?? []}
                  loading={loading}
                  error={error}
                  selectedId={selectedConv?.id ?? null}
                  onSelect={handleSelectConversation}
                  patients={patients ?? []}
                  onNewConversation={handleNewConversation}
                  creating={creating}
                  defaultPatientId={patientId ?? null}
                />
              </div>

              {/* Mobile: full-width list when no conv selected */}
              <div
                className={`flex md:hidden w-full h-full ${selectedConv ? "hidden" : "flex"}`}
              >
                <ConversationList
                  conversations={conversations ?? []}
                  loading={loading}
                  error={error}
                  selectedId={selectedConv?.id ?? null}
                  onSelect={handleSelectConversation}
                  patients={patients ?? []}
                  onNewConversation={handleNewConversation}
                  creating={creating}
                  defaultPatientId={patientId ?? null}
                />
              </div>

              {/* Right: conversation view */}
              <div
                className={`flex-1 flex flex-col overflow-hidden ${
                  !selectedConv ? "hidden md:flex" : "flex"
                }`}
              >
                <ConversationView
                  conversation={selectedConv}
                  doctor={doctor}
                  onStatusChange={handleStatusChange}
                  onBack={() => setSelectedConv(null)}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      <AlertsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
