import { useMemo } from "react";
import type { Patient } from "@/lib/verifact-data";

export interface DashboardMetrics {
  total: number;
  highRisk: number;
  needsReview: number;
  stable: number;
  avgScore: number;
  distribution: { tier: "High" | "Moderate" | "Stable"; count: number }[];
}

export function useDashboardMetrics(patients: Patient[] | null): DashboardMetrics {
  return useMemo(() => {
    const list = patients ?? [];
    const total = list.length;
    const highRisk = list.filter((p) => p.riskScore >= 75).length;
    const needsReview = list.filter((p) => p.riskScore >= 50 && p.riskScore < 75).length;
    const stable = list.filter((p) => p.riskScore < 50).length;
    const avgScore = total ? Math.round(list.reduce((s, p) => s + p.riskScore, 0) / total) : 0;
    return {
      total,
      highRisk,
      needsReview,
      stable,
      avgScore,
      distribution: [
        { tier: "High", count: highRisk },
        { tier: "Moderate", count: needsReview },
        { tier: "Stable", count: stable },
      ],
    };
  }, [patients]);
}
