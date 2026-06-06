import { useMemo, useState } from "react";
import { ChevronRight, Filter, Pencil, Plus, Search, AlertCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Patient } from "@/lib/verifact-data";



function riskColor(score: number) {
  if (score >= 75) return { bar: "bg-destructive", text: "text-destructive" };
  if (score >= 50) return { bar: "bg-warning", text: "text-warning-foreground" };
  return { bar: "bg-success", text: "text-success" };
}

function statusChip(status: Patient["status"]) {
  switch (status) {
    case "Urgent": return "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20";
    case "Needs Review": return "bg-warning/15 text-warning-foreground ring-1 ring-inset ring-warning/30";
    default: return "bg-success/10 text-success ring-1 ring-inset ring-success/20";
  }
}

interface PatientTableProps {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  onSelect?: (patient: Patient) => void;
  onEdit?: (patient: Patient) => void;
  onAdd?: () => void;
}

export function PatientTable({ patients, loading, error, onSelect, onEdit, onAdd }: PatientTableProps) {
  const [riskFilter, setRiskFilter] = useState<"All" | "Red" | "Amber" | "Green">("All");
  const [selectedCondition, setSelectedCondition] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("risk-desc");
  const [query, setQuery] = useState("");

  const allConditions = useMemo(() => {
    const conds = new Set<string>();
    patients.forEach((p) => {
      p.conditions?.forEach((c) => {
        if (c && c.trim()) {
          conds.add(c.trim());
        }
      });
    });
    return Array.from(conds).sort();
  }, [patients]);

  const rows = useMemo(() => {
    let r = [...patients];

    if (query) {
      const q = query.toLowerCase();
      r = r.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(q);
        const phoneMatch = p.phone?.toLowerCase().includes(q);
        const condMatch = p.conditions?.some((c) => c.toLowerCase().includes(q));
        return nameMatch || phoneMatch || condMatch;
      });
    }

    if (riskFilter !== "All") {
      if (riskFilter === "Red") r = r.filter((p) => p.riskScore >= 75);
      if (riskFilter === "Amber") r = r.filter((p) => p.riskScore >= 50 && p.riskScore < 75);
      if (riskFilter === "Green") r = r.filter((p) => p.riskScore < 50);
    }

    if (selectedCondition !== "All") {
      r = r.filter((p) => p.conditions?.some((c) => c.trim().toLowerCase() === selectedCondition.toLowerCase()));
    }

    r.sort((a, b) => {
      switch (sortBy) {
        case "risk-desc": return b.riskScore - a.riskScore;
        case "risk-asc": return a.riskScore - b.riskScore;
        case "age-desc": return b.age - a.age;
        case "age-asc": return a.age - b.age;
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "updated": {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
        default: return 0;
      }
    });

    return r;
  }, [patients, query, riskFilter, selectedCondition, sortBy]);

  return (
    <section className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Priority Queue</h2>
          <p className="text-xs text-muted-foreground">Ranked by composite risk score (priority_scores.score).</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, or condition…" className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
          {onAdd && (
            <button onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-md bg-[image:var(--gradient-primary)] px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-95">
              <Plus className="h-4 w-4" /> Add patient
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 bg-muted/20">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">Risk:</span>
          <button
            onClick={() => setRiskFilter("All")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors border",
              riskFilter === "All"
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-foreground border-border hover:bg-secondary"
            )}
          >
            All
          </button>
          <button
            onClick={() => setRiskFilter("Red")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors border",
              riskFilter === "Red"
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "bg-card text-destructive border-border hover:bg-destructive/10"
            )}
          >
            Red
          </button>
          <button
            onClick={() => setRiskFilter("Amber")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors border",
              riskFilter === "Amber"
                ? "bg-warning text-warning-foreground border-warning"
                : "bg-card text-warning-foreground border-border hover:bg-warning/10"
            )}
          >
            Amber
          </button>
          <button
            onClick={() => setRiskFilter("Green")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors border",
              riskFilter === "Green"
                ? "bg-success text-success-foreground border-success"
                : "bg-card text-success border-border hover:bg-success/10"
            )}
          >
            Green
          </button>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Condition:</span>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 cursor-pointer"
          >
            <option value="All">All Conditions</option>
            {allConditions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 cursor-pointer"
          >
            <option value="risk-desc">Risk Score High → Low</option>
            <option value="risk-asc">Risk Score Low → High</option>
            <option value="age-desc">Age High → Low</option>
            <option value="age-asc">Age Low → High</option>
            <option value="name-asc">Name A → Z</option>
            <option value="name-desc">Name Z → A</option>
            <option value="updated">Last Updated</option>
          </select>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-muted-foreground font-medium">
            Showing {rows.length} of {patients.length} patients
          </span>
          {(query || riskFilter !== "All" || selectedCondition !== "All" || sortBy !== "risk-desc") && (
            <button
              onClick={() => {
                setQuery("");
                setRiskFilter("All");
                setSelectedCondition("All");
                setSortBy("risk-desc");
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-secondary/80 hover:bg-secondary border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Patient</th>
              <th className="px-3 py-3 font-medium">Age</th>
              <th className="px-3 py-3 font-medium">Conditions</th>
              <th className="px-3 py-3 font-medium w-56">Risk score</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-4"><div className="h-3 w-4 animate-pulse rounded bg-muted" /></td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                    <div className="space-y-2"><div className="h-3 w-32 animate-pulse rounded bg-muted" /><div className="h-2 w-20 animate-pulse rounded bg-muted" /></div>
                  </div>
                </td>
                <td className="px-3 py-4"><div className="h-3 w-8 animate-pulse rounded bg-muted" /></td>
                <td className="px-3 py-4"><div className="h-5 w-40 animate-pulse rounded bg-muted" /></td>
                <td className="px-3 py-4"><div className="h-2 w-full animate-pulse rounded bg-muted" /></td>
                <td className="px-3 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></td>
                <td className="px-5 py-4"><div className="ml-auto h-6 w-20 animate-pulse rounded bg-muted" /></td>
              </tr>
            ))}
            {!loading && error && (
              <tr><td colSpan={7} className="px-5 py-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertCircle className="h-5 w-5" /></div>
                <div className="text-sm font-medium text-foreground">Couldn't load patients</div>
                <div className="text-xs text-muted-foreground">{error}</div>
              </td></tr>
            )}
            {!loading && !error && rows.map((p, idx) => {
              const risk = riskColor(p.riskScore);
              return (
                <tr key={p.id} onClick={() => onSelect?.(p)} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 text-muted-foreground tabular-nums">{idx + 1}</td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">MRN-{p.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-muted-foreground">{p.age}</td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-1">
                      {p.conditions.length === 0 && <span className="text-[11px] text-muted-foreground">—</span>}
                      {p.conditions.map((c) => (
                        <span key={c} className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", risk.bar)} style={{ width: `${p.riskScore}%` }} />
                      </div>
                      <span className={cn("text-xs font-semibold tabular-nums w-8 text-right", risk.text)}>{p.riskScore}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", statusChip(p.status))}>{p.status}</span>
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button onClick={() => onEdit(p)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                      )}
                      <button onClick={() => onSelect?.(p)} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                        View <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground"><Users className="h-5 w-5" /></div>
                <div className="text-sm font-medium text-foreground">{patients.length === 0 ? "No patients yet" : "No patients match this filter"}</div>
                <div className="text-xs text-muted-foreground">{patients.length === 0 ? "Click \u201cAdd patient\u201d to enroll your first chronic-care patient." : "Try clearing filters or searching by another name."}</div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
