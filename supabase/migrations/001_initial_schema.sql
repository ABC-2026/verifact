-- ============================================================
-- Verifact — Full Schema Migration
-- Run: supabase db push
-- Owner: Dev D
-- ============================================================

-- Enable pgvector for future semantic search
create extension if not exists vector;

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────

create type triage_severity as enum ('green', 'amber', 'red');
create type access_level as enum ('caregiver', 'readonly');
create type prescription_status as enum ('active', 'dispensed', 'cancelled');
create type notification_channel as enum ('whatsapp', 'in_app');
create type recipient_type as enum ('patient', 'doctor', 'admin', 'caregiver');

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

-- patients
create table patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  phone text unique not null,
  language_pref text not null default 'en',
  condition_tags text[] default '{}',
  insurance_id uuid,
  age integer,
  allergies text[] default '{}',
  family_history jsonb default '{}',
  monitoring_enrolled boolean default true,
  created_at timestamptz default now()
);

-- doctors
create table doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  specialisation text,
  created_at timestamptz default now()
);

-- doctor_patient assignments
create table doctor_patients (
  doctor_id uuid references doctors(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  primary key (doctor_id, patient_id)
);

-- voice_notes (P3 check-ins)
create table voice_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  transcript text,
  extracted_data jsonb default '{}',
  -- extracted_data shape:
  -- { symptoms: [], vitals: {}, medications_status: [], mood: string,
  --   activity: string, red_flags: [], confidence: number }
  duration_sec integer,
  recorded_at timestamptz default now(),
  audio_url text
);

-- triage_results (output of P3 triage step)
create table triage_results (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references voice_notes(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  severity triage_severity not null,
  summary text,
  reasoning text,
  created_at timestamptz default now()
);

-- prescriptions (P2 + D3)
create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references doctors(id),
  drugs jsonb not null default '[]',
  -- drugs shape: [{ name, dosage, frequency, duration, translation?, explanation? }]
  extracted_from_image boolean default false,
  image_url text,
  status prescription_status default 'active',
  created_at timestamptz default now()
);

-- reminders (P2 medication schedule)
create table reminders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  prescription_id uuid references prescriptions(id) on delete cascade,
  drug_name text not null,
  scheduled_time time not null,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz default now()
);

-- insurance_policies (P4)
create table insurance_policies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  insurer_name text,
  policy_json jsonb default '{}',
  -- policy_json shape: { sum_insured, sub_limits, exclusions, copay_terms, ... }
  sum_insured numeric,
  uploaded_at timestamptz default now()
);

-- vitals (A2)
create table vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  bp text,          -- e.g. "148/92"
  temp numeric,     -- celsius
  weight numeric,   -- kg
  spo2 numeric,     -- percent
  context_note text,-- AI-generated contextualisation for doctor
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz default now()
);

-- inventory (A3)
create table inventory (
  id uuid primary key default gen_random_uuid(),
  drug_name text not null,
  generic_name text,
  quantity integer not null default 0,
  unit text not null default 'tablets',
  location text,
  expiry_date date,
  reorder_threshold integer not null default 50,
  suggested_order_qty integer,
  last_updated timestamptz default now()
);

-- inventory_log (A3 — audit trail)
create table inventory_log (
  id uuid primary key default gen_random_uuid(),
  drug_id uuid references inventory(id) on delete cascade,
  quantity_deducted integer not null,
  prescription_id uuid references prescriptions(id),
  admin_id uuid references auth.users(id),
  timestamp timestamptz default now()
);

-- care_circles (P5)
create table care_circles (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  member_phone text not null,
  member_name text,
  access_level access_level not null default 'readonly',
  invite_accepted boolean default false,
  created_at timestamptz default now()
);

-- patient_baselines (D4 behaviour tracking)
create table patient_baselines (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade unique,
  avg_note_duration_sec numeric,
  avg_record_hour numeric,    -- 0–23 float
  symptom_frequencies jsonb default '{}',
  computed_at timestamptz default now()
);

-- notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references auth.users(id) on delete cascade,
  recipient_type recipient_type not null,
  message text not null,
  channel notification_channel not null,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- priority_scores (A1 — refreshed after each triage write)
create table priority_scores (
  patient_id uuid primary key references patients(id) on delete cascade,
  score integer not null default 0,  -- 1–100
  reasoning text,
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table patients enable row level security;
alter table doctors enable row level security;
alter table doctor_patients enable row level security;
alter table voice_notes enable row level security;
alter table triage_results enable row level security;
alter table prescriptions enable row level security;
alter table reminders enable row level security;
alter table insurance_policies enable row level security;
alter table vitals enable row level security;
alter table inventory enable row level security;
alter table inventory_log enable row level security;
alter table care_circles enable row level security;
alter table patient_baselines enable row level security;
alter table notifications enable row level security;
alter table priority_scores enable row level security;

-- Helper: check if current user is admin (role stored in auth.users metadata)
create or replace function is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (select raw_user_meta_data->>'role' = 'admin'
     from auth.users where id = auth.uid()),
    false
  );
$$;

-- Helper: check if current user is a doctor assigned to a patient
create or replace function is_assigned_doctor(p_patient_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from doctor_patients dp
    join doctors d on d.id = dp.doctor_id
    where dp.patient_id = p_patient_id and d.user_id = auth.uid()
  );
$$;

-- patients RLS
create policy "patient reads own row"
  on patients for select using (user_id = auth.uid());
create policy "doctor reads assigned patients"
  on patients for select using (is_assigned_doctor(id));
create policy "admin reads all patients"
  on patients for select using (is_admin());
create policy "admin writes patients"
  on patients for all using (is_admin());

-- voice_notes RLS
create policy "patient reads own notes"
  on voice_notes for select using (
    patient_id in (select id from patients where user_id = auth.uid()));
create policy "doctor reads assigned notes"
  on voice_notes for select using (is_assigned_doctor(patient_id));
create policy "admin reads all notes"
  on voice_notes for select using (is_admin());

-- triage_results RLS
create policy "doctor reads assigned triage"
  on triage_results for select using (is_assigned_doctor(patient_id));
create policy "admin reads all triage"
  on triage_results for select using (is_admin());

-- prescriptions RLS
create policy "patient reads own prescriptions"
  on prescriptions for select using (
    patient_id in (select id from patients where user_id = auth.uid()));
create policy "doctor reads and writes assigned prescriptions"
  on prescriptions for all using (is_assigned_doctor(patient_id));
create policy "admin reads all prescriptions"
  on prescriptions for select using (is_admin());

-- reminders RLS
create policy "patient reads own reminders"
  on reminders for select using (
    patient_id in (select id from patients where user_id = auth.uid()));
create policy "admin reads all reminders"
  on reminders for all using (is_admin());

-- insurance_policies RLS
create policy "patient owns own policy"
  on insurance_policies for all using (
    patient_id in (select id from patients where user_id = auth.uid()));

-- vitals RLS
create policy "doctor reads assigned vitals"
  on vitals for select using (is_assigned_doctor(patient_id));
create policy "admin reads and writes vitals"
  on vitals for all using (is_admin());

-- inventory RLS
create policy "admin full access inventory"
  on inventory for all using (is_admin());
create policy "doctor reads inventory"
  on inventory for select using (
    exists (select 1 from doctors where user_id = auth.uid()));

-- inventory_log RLS
create policy "admin reads all inventory log"
  on inventory_log for select using (is_admin());

-- care_circles RLS
create policy "patient manages own care circle"
  on care_circles for all using (
    patient_id in (select id from patients where user_id = auth.uid()));

-- notifications RLS
create policy "user reads own notifications"
  on notifications for select using (recipient_id = auth.uid());

-- priority_scores RLS
create policy "admin reads all priority scores"
  on priority_scores for all using (is_admin());
create policy "doctor reads assigned priority scores"
  on priority_scores for select using (is_assigned_doctor(patient_id));

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

create index on voice_notes (patient_id, recorded_at desc);
create index on triage_results (patient_id, created_at desc);
create index on triage_results (severity);
create index on prescriptions (patient_id, created_at desc);
create index on inventory (expiry_date);
create index on priority_scores (score desc);
create index on notifications (recipient_id, read_at);
