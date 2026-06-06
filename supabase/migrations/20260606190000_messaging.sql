-- =============================================================================
-- Verifact: Doctor-Patient Communication System
-- Creates conversations + messages tables, opens RLS, seeds demo data.
-- NOTE: Open policies are intentional for this demo. Re-tighten before prod.
-- =============================================================================

-- -------------------------
-- 1. Create tables
-- -------------------------

create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id  uuid not null references public.doctors(id)  on delete cascade,
  status     text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type     text not null check (sender_type in ('doctor', 'patient')),
  sender_id       uuid not null,
  message         text not null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- -------------------------
-- 2. Indexes
-- -------------------------
create index if not exists messages_conversation_id_idx on public.messages (conversation_id, created_at);
create index if not exists conversations_doctor_id_idx   on public.conversations (doctor_id);
create index if not exists conversations_patient_id_idx  on public.conversations (patient_id);

-- -------------------------
-- 3. Open RLS (demo pattern matching existing migration)
-- -------------------------
do $$
declare t text;
begin
  foreach t in array array['conversations', 'messages'] loop
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "demo_all_select" on public.%I', t);
    execute format('drop policy if exists "demo_all_insert" on public.%I', t);
    execute format('drop policy if exists "demo_all_update" on public.%I', t);
    execute format('drop policy if exists "demo_all_delete" on public.%I', t);
    execute format('create policy "demo_all_select" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "demo_all_insert" on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('create policy "demo_all_update" on public.%I for update to anon, authenticated using (true) with check (true)', t);
    execute format('create policy "demo_all_delete" on public.%I for delete to anon, authenticated using (true)', t);
  end loop;
end $$;

-- -------------------------
-- 4. Seed demo conversation
-- -------------------------
do $$
declare
  v_patient_id uuid;
  v_doctor_id  uuid;
  v_conv_id    uuid;
begin
  -- Pick first patient (Ravi Kumar) and first doctor
  select id into v_patient_id from public.patients where name = 'Ravi Kumar' limit 1;
  select id into v_doctor_id  from public.doctors  limit 1;

  -- Only seed if no conversations exist yet and we have both ids
  if v_patient_id is null or v_doctor_id is null then
    return;
  end if;
  if exists (select 1 from public.conversations limit 1) then
    return;
  end if;

  -- Insert seed conversation
  insert into public.conversations (patient_id, doctor_id, status, created_at, updated_at)
  values (v_patient_id, v_doctor_id, 'open', now() - interval '2 hours', now() - interval '30 minutes')
  returning id into v_conv_id;

  -- Seed two messages
  insert into public.messages (conversation_id, sender_type, sender_id, message, is_read, created_at)
  values
    (v_conv_id, 'patient', v_patient_id,
     'Doctor, my fasting glucose was 218 mg/dL this morning. Should I be worried? I also felt dizzy when I stood up.',
     true, now() - interval '2 hours'),
    (v_conv_id, 'doctor', v_doctor_id,
     'Ravi, thank you for checking in. Yes, that reading is higher than your target. Please avoid carbohydrates for your next meal and take your evening metformin as scheduled. If dizziness continues or glucose stays above 200 for the next two readings, please call the clinic. I have scheduled a tele-consult for tomorrow at 10 AM.',
     false, now() - interval '30 minutes');

  -- Seed notification for the unread doctor reply
  insert into public.notifications (message, created_at, read_at)
  values ('Ravi Kumar sent you a message regarding elevated glucose levels.', now() - interval '2 hours', null);
end $$;
