import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { createPatient, updatePatient, type PatientInput } from "@/lib/hooks/usePatients";
import type { Patient } from "@/lib/verifact-data";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patient?: Patient | null;
}

const empty: PatientInput = { name: "", age: 0, phone: "", conditions: [], initialScore: undefined };

export function PatientFormDialog({ open, onClose, onSaved, patient }: Props) {
  const [form, setForm] = useState<PatientInput>(empty);
  const [conditionsText, setConditionsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (patient) {
      setForm({
        name: patient.name, age: patient.age, phone: patient.phone ?? "",
        conditions: patient.conditions, initialScore: patient.riskScore,
      });
      setConditionsText(patient.conditions.join(", "));
    } else {
      setForm(empty); setConditionsText("");
    }
    setError(null);
  }, [open, patient]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const conditions = conditionsText.split(",").map((c) => c.trim()).filter(Boolean);
      const payload = { ...form, conditions };
      if (patient) {
        await updatePatient(patient.id, payload);
        toast.success("Patient updated successfully");
      } else {
        await createPatient(payload);
        toast.success("Patient registered successfully");
      }
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{patient ? "Edit patient" : "Add patient"}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <Field label="Full name">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Ravi Kumar" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input required type="number" min={0} max={130} value={form.age || ""} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+91 98xxx" />
            </Field>
          </div>
          <Field label="Conditions (comma separated)">
            <input value={conditionsText} onChange={(e) => setConditionsText(e.target.value)} className={inputCls} placeholder="Type 2 Diabetes, Hypertension" />
          </Field>
          <Field label="Priority score (0–100)">
            <input type="number" min={0} max={100} value={form.initialScore ?? ""} onChange={(e) => setForm({ ...form, initialScore: e.target.value === "" ? undefined : Number(e.target.value) })} className={inputCls} placeholder="e.g. 72" />
          </Field>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {patient ? "Save changes" : "Add patient"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
