import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import type { DashboardMetrics } from "@/lib/hooks/useDashboardMetrics";

const colors: Record<string, string> = {
  High: "oklch(0.6 0.22 27)",
  Moderate: "oklch(0.75 0.16 75)",
  Stable: "oklch(0.62 0.16 155)",
};

interface Props { metrics: DashboardMetrics; loading?: boolean; }

export function TrendChart({ metrics, loading }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Current Risk Distribution</h3>
          <p className="text-xs text-muted-foreground">{metrics.total} monitored patients · derived from priority_scores</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />High</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />Moderate</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Stable</span>
        </div>
      </div>
      <div className="h-56">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
        ) : metrics.total === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No patients yet — add one to populate the chart.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.distribution} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
              <XAxis dataKey="tier" tick={{ fontSize: 11, fill: "oklch(0.5 0.02 240)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "oklch(0.5 0.02 240)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.01 240)", fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {metrics.distribution.map((d) => <Cell key={d.tier} fill={colors[d.tier]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
