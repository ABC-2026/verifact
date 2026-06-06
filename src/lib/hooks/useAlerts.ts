import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { NotificationRow } from "@/lib/verifact-data";

const DEMO_NOTIFICATIONS = [
  {
    message: "Ravi Kumar: Fasting glucose spiked to 212 mg/dL — 3rd consecutive high reading. Consider medication review.",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read_at: null,
  },
  {
    message: "Lakshmi Iyer: Weight gain of 1.8 kg in 5 days. Possible fluid retention — CHF exacerbation risk elevated.",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read_at: null,
  },
  {
    message: "Mohammed Arif: SpO₂ dropped to 87% at 11:42 PM. Rescue inhaler used twice today. COPD flare suspected.",
    created_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    read_at: null,
  },
  {
    message: "Priya Menon: Missed last 2 medication check-ins. Adherence tracking shows a 3-day gap.",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read_at: null,
  },
  {
    message: "Sanjay Patel: Evening statin dose missed on 3 of the last 5 days. Lipid panel follow-up recommended.",
    created_at: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    read_at: null,
  },
  {
    message: "Aarti Deshpande: Skipped weekly check-in survey. Last BP reading: 148/94 mmHg — borderline.",
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    read_at: null,
  },
  {
    message: "Ravi Kumar: Blood pressure 168/102 mmHg recorded at home. Sustained hypertensive episode — review antihypertensive.",
    created_at: new Date(Date.now() - 54 * 60 * 60 * 1000).toISOString(),
    read_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    message: "Vikram Reddy: Routine eGFR lab results uploaded — stable at 42. Nephrology review due in 6 weeks.",
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    read_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    message: "Neha Sharma: Prescription refill due in 3 days. Auto-reminder sent to patient.",
    created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    read_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    message: "Rajesh Khanna: Quarterly HbA1c result received — 6.8%, within target range. No action needed.",
    created_at: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
    read_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
  },
];

export function useAlerts() {
  const [data, setData] = useState<NotificationRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: rows, error: err } = await supabase
      .from("notifications")
      .select("id, message, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (err) {
      setError(err.message);
      setData(null);
      setLoading(false);
      return;
    }

    // If table is empty, seed demo notifications then refetch
    if ((rows ?? []).length === 0) {
      const { error: seedErr } = await supabase
        .from("notifications")
        .insert(DEMO_NOTIFICATIONS);

      if (seedErr) {
        console.error("Failed to seed notifications:", seedErr.message);
        setData([]);
        setLoading(false);
        return;
      }

      // Refetch after seeding
      const { data: seeded, error: refetchErr } = await supabase
        .from("notifications")
        .select("id, message, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (refetchErr) {
        setError(refetchErr.message);
        setData(null);
      } else {
        setData(
          (seeded ?? []).map((r) => ({
            id: r.id,
            message: r.message ?? "",
            createdAt: r.created_at,
            readAt: r.read_at,
          }))
        );
      }
      setLoading(false);
      return;
    }

    setData(
      (rows ?? []).map((r) => ({
        id: r.id,
        message: r.message ?? "",
        createdAt: r.created_at,
        readAt: r.read_at,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(async () => {
      const { data: rows, error: err } = await supabase
        .from("notifications")
        .select("id, message, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!err && rows) {
        setData(
          rows.map((r) => ({
            id: r.id,
            message: r.message ?? "",
            createdAt: r.created_at,
            readAt: r.read_at,
          }))
        );
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [fetch]);

  /** Optimistically marks one alert as read and persists to Supabase. */
  const markAsRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    // Optimistic update
    setData((prev) =>
      prev ? prev.map((a) => (a.id === id ? { ...a, readAt: now } : a)) : prev
    );
    // Persist
    const { error: err } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id);
    if (err) {
      console.error("Failed to mark alert as read:", err.message);
      // Roll back optimistic update
      setData((prev) =>
        prev ? prev.map((a) => (a.id === id ? { ...a, readAt: null } : a)) : prev
      );
    }
  }, []);

  /** Optimistically marks ALL unread alerts as read and persists to Supabase. */
  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    setData((prev) => {
      if (!prev) return prev;
      const unreadIds = prev.filter((a) => !a.readAt).map((a) => a.id);
      if (unreadIds.length === 0) return prev;

      // Fire Supabase update asynchronously
      supabase
        .from("notifications")
        .update({ read_at: now })
        .in("id", unreadIds)
        .then(({ error: err }) => {
          if (err) {
            console.error("Failed to mark all as read:", err.message);
            // Refetch to restore server state
            fetch();
          }
        });

      return prev.map((a) => (!a.readAt ? { ...a, readAt: now } : a));
    });
  }, [fetch]);

  return { data, loading, error, markAsRead, markAllAsRead, refetch: fetch };
}
