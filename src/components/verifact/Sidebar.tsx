import { LayoutDashboard, Users, BellRing, FileBarChart, Settings, LogOut, Activity, MessageSquare } from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useCurrentDoctor } from "@/lib/hooks/useCurrentDoctor";

interface Props {
  urgentCount?: number;
  alertCount?: number;
  messagesCount?: number;
  onOpenAlerts?: () => void;
  onNavigate?: (label: string) => void;
  onClose?: () => void;
  className?: string;
}

const nav = [
  { label: "Dashboard", icon: LayoutDashboard, route: "/", useUrgent: true },
  { label: "Patients", icon: Users, route: "/patients" },
  { label: "Alerts", icon: BellRing, useAlerts: true, route: "/alerts" },
  { label: "Messages", icon: MessageSquare, useMessages: true, route: "/messages" },
  { label: "Reports", icon: FileBarChart, route: "/reports" },
  { label: "Settings", icon: Settings, route: "/settings" },
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function Sidebar({ urgentCount = 0, alertCount = 0, messagesCount = 0, onOpenAlerts, onNavigate, onClose, className }: Props) {
  const doctor = useCurrentDoctor();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className={cn("flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border", className)}>
      <div className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <div className="text-base font-semibold tracking-tight">Verifact</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Clinical Suite</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          // Dashboard shows high-risk patient count; Alerts shows unread notification count
          const badge = item.useUrgent
            ? urgentCount
            : item.useAlerts
            ? alertCount
            : item.useMessages
            ? messagesCount
            : 0;
          const isActive = location.pathname === item.route;

          const handleClick = () => {
            if (isActive && typeof onNavigate === "function") {
              onNavigate(item.label);
            } else {
              navigate({ to: item.route });
            }
            if (typeof onClose === "function") {
              onClose();
            }
          };

          return (
            <button
              key={item.label}
              onClick={handleClick}
              className={cn(
                "w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
              title={isActive ? `You are on ${item.label}` : undefined}
            >
              <span className="flex items-center gap-3"><item.icon className="h-4 w-4" />{item.label}</span>
              {badge > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
            {doctor ? initials(doctor.name) : "—"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{doctor?.name ?? "Sign in"}</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">{doctor?.phone ?? "Verifact Clinical Suite"}</div>
          </div>
          <button disabled title="Sign in not implemented in MVP" aria-disabled="true" className="text-sidebar-foreground/40 cursor-not-allowed" aria-label="Logout"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </aside>
  );
}
