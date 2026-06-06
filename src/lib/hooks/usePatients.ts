import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import type { Patient } from "@/lib/verifact-data";
import { statusFromScore } from "@/lib/verifact-data";

interface Row {
  id: string;
  name: string;
  age: number | null;
  phone: string | null;
  condition_tags: string[] | null;
  created_at: string | null;
  priority_scores: { score: number | null }[] | { score: number | null } | null;
}

function mapRow(r: Row): Patient {
  const ps = Array.isArray(r.priority_scores) ? r.priority_scores[0] : r.priority_scores;
  const score = ps?.score ?? 0;
  return {
    id: r.id,
    name: r.name,
    age: r.age ?? 0,
    phone: r.phone,
    conditions: r.condition_tags ?? [],
    riskScore: score,
    status: statusFromScore(score),
    createdAt: r.created_at,
  };
}

export function usePatients() {
  const [data, setData] = useState<Patient[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Log the exact Supabase URL and query we are about to run.
    // eslint-disable-next-line no-console
    console.log("[usePatients] Supabase URL:", SUPABASE_URL);
    // eslint-disable-next-line no-console
    console.log('[usePatients] Query: from("patients").select("id, name, age, phone, condition_tags, created_at, priority_scores(score)")');

    const { data: rows, error: err } = await supabase
      .from("patients")
      .select("id, name, age, phone, condition_tags, created_at, priority_scores(score)");

    // Log raw Supabase response for debugging
    // eslint-disable-next-line no-console
    console.log('[usePatients] response rows:', rows, 'error:', err);

    if (err) {
      setError(err.message);
      setData(null);
    } else {
      setData((rows as Row[] | null ?? []).map(mapRow).sort((a, b) => b.riskScore - a.riskScore));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

export interface PatientInput {
  name: string;
  age: number;
  phone?: string | null;
  conditions: string[];
  initialScore?: number;
}

export async function createPatient(input: PatientInput): Promise<string> {
  const { data, error } = await supabase
    .from("patients")
    .insert({ name: input.name, age: input.age, phone: input.phone ?? null, condition_tags: input.conditions })
    .select("id")
    .single();
  if (error) throw error;
  const id = data.id as string;
  if (typeof input.initialScore === "number") {
    const { error: e2 } = await supabase
      .from("priority_scores")
      .insert({ patient_id: id, score: input.initialScore, updated_at: new Date().toISOString() });
    if (e2) throw e2;
  }
  return id;
}

export async function updatePatient(id: string, input: PatientInput): Promise<void> {
  const { error } = await supabase
    .from("patients")
    .update({ name: input.name, age: input.age, phone: input.phone ?? null, condition_tags: input.conditions })
    .eq("id", id);
  if (error) throw error;
  if (typeof input.initialScore === "number") {
    const { data: existing } = await supabase
      .from("priority_scores").select("patient_id").eq("patient_id", id).maybeSingle();
    if (existing) {
      const { error: e2 } = await supabase
        .from("priority_scores")
        .update({ score: input.initialScore, updated_at: new Date().toISOString() })
        .eq("patient_id", id);
      if (e2) throw e2;
    } else {
      const { error: e3 } = await supabase
        .from("priority_scores")
        .insert({ patient_id: id, score: input.initialScore, updated_at: new Date().toISOString() });
      if (e3) throw e3;
    }
  }
}
