import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down";
  goodWhen?: "up" | "down";
  icon: LucideIcon;
  accent?: "primary" | "destructive" | "success" | "warning";
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
};

export function MetricCard({ label, value, delta, trend, goodWhen = "up", icon: Icon, accent = "primary" }: MetricCardProps) {
  const isGood = trend === goodWhen;
  const showDelta = !!delta && !!trend;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        {showDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              isGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}
          >
            {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}