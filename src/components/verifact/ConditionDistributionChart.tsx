import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  data: { name: string; count: number }[];
  loading?: boolean;
}

export function ConditionDistributionChart({ data, loading }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Condition Distribution</h3>
        <p className="text-xs text-muted-foreground">Frequency of chronic conditions across patient registry</p>
      </div>
      <div className="h-56">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No condition data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.5 0.02 240)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "oklch(0.5 0.02 240)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.01 240)", fontSize: 12 }} />
              <Bar dataKey="count" fill="oklch(0.62 0.16 240)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
