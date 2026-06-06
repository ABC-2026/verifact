import { useState } from "react";
import { Search, Bell, Menu } from "lucide-react";
import { useCurrentDoctor } from "@/lib/hooks/useCurrentDoctor";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/verifact/Sidebar";

interface TopbarProps {
  title: string;
  onOpenAlerts: () => void;
  alertCount: number;
  onSearch?: (q: string) => void;
  searchValue?: string;
  urgentCount?: number;
  onNavigate?: (label: string) => void;
}

function todayLabel() {
  try {
    return new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch { return ""; }
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function Topbar({ title, onOpenAlerts, alertCount, onSearch, searchValue, urgentCount, onNavigate }: TopbarProps) {
  const doctor = useCurrentDoctor();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card text-foreground transition-colors hover:bg-secondary lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <Sidebar
              urgentCount={urgentCount}
              onOpenAlerts={onOpenAlerts}
              onNavigate={onNavigate}
              onClose={() => setIsOpen(false)}
              className="h-full border-r-0 w-full"
            />
          </SheetContent>
        </Sheet>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{todayLabel()}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onSearch && (
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue ?? ""}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="Search patients by name…"
              className="h-9 w-80 rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        )}

        <button onClick={onOpenAlerts} className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card text-foreground transition-colors hover:bg-secondary" aria-label="Open alerts">
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{alertCount}</span>
          )}
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {doctor ? initials(doctor.name) : "—"}
        </div>
      </div>
    </header>
  );
}
