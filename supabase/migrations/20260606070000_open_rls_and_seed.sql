-- Verifact: open RLS for the demo (anon read/write) + seed real-ish patients.
-- NOTE: Open policies are intentional for this demo only. Re-tighten before production.

do $$
declare t text;
begin
  foreach t in array array[
    'patients','priority_scores','triage_results','voice_notes',
    'prescriptions','doctors','doctor_patients','care_circles',
    'patient_baselines','notifications'
  ] loop
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

do $$
declare
  rec jsonb;
  pid uuid;
  seed_rows constant jsonb := '[
    {"name":"Ravi Kumar","age":62,"phone":"+91 98201 11122","conds":["Type 2 Diabetes","Hypertension"],"score":92,"sev":"high","sum":"Composite risk has risen sharply over the last 14 days driven by uncontrolled fasting glucose (avg 184 mg/dL) and sustained BP elevation (avg 162/98).","reason":"Two self-reported dizziness episodes in the last 72h. Adherence trending down. Recommend tele-consult within 24h and consider medication titration."},
    {"name":"Lakshmi Iyer","age":58,"phone":"+91 98765 43210","conds":["CHF","Diabetes"],"score":88,"sev":"high","sum":"CHF exacerbation risk elevated. Weight gain of 1.8 kg over 5 days suggests fluid retention.","reason":"HbA1c trending up. Diuretic adherence inconsistent. Escalate to cardiology review."},
    {"name":"Mohammed Arif","age":71,"phone":"+91 99830 22014","conds":["COPD","Hypertension"],"score":84,"sev":"high","sum":"SpO2 dropped to 89% twice this week. Increased rescue inhaler use.","reason":"Likely COPD flare. Consider short course of oral steroids and pulmonary follow-up."},
    {"name":"Priya Menon","age":49,"phone":"+91 90345 56712","conds":["Type 2 Diabetes"],"score":71,"sev":"moderate","sum":"Fasting glucose 184 mg/dL for 3rd consecutive day. Otherwise stable vitals.","reason":"Reinforce dietary counseling and review evening metformin timing."},
    {"name":"Sanjay Patel","age":66,"phone":"+91 98980 71156","conds":["Post-MI","Hyperlipidemia"],"score":68,"sev":"moderate","sum":"Missed evening statin dose 2 of last 5 days. Lipid panel mildly above target.","reason":"Adherence counseling; no acute symptoms reported."},
    {"name":"Aarti Deshpande","age":54,"phone":"+91 91670 34988","conds":["Hypertension"],"score":64,"sev":"moderate","sum":"Skipped weekly check-in survey. Last BP reading borderline (148/94).","reason":"Outreach to confirm patient status; schedule routine follow-up."},
    {"name":"Vikram Reddy","age":60,"phone":"+91 99490 99281","conds":["Diabetes","CKD Stage 3"],"score":59,"sev":"moderate","sum":"eGFR stable at 42. Glycemic control adequate this month.","reason":"Continue current regimen. Schedule nephrology review in 6 weeks."},
    {"name":"Suresh Nair","age":45,"phone":"+91 95440 11003","conds":["Hypertension"],"score":52,"sev":"moderate","sum":"BP within target on most days but morning spikes noted.","reason":"Consider shifting amlodipine to evening dose."},
    {"name":"Meera Kapoor","age":63,"phone":"+91 98113 56441","conds":["Diabetes","Hypothyroid"],"score":51,"sev":"moderate","sum":"TSH within range. Postprandial glucose mildly elevated.","reason":"Reinforce post-meal walks; recheck HbA1c in 8 weeks."},
    {"name":"Arjun Nair","age":41,"phone":"+91 90873 12005","conds":["Hypertension","Obesity"],"score":44,"sev":"low","sum":"Weight stable. BP trending down with current regimen.","reason":"Continue lifestyle plan. Quarterly review."},
    {"name":"Neha Sharma","age":45,"phone":"+91 98101 23456","conds":["Hypertension"],"score":38,"sev":"low","sum":"All readings within target range over the last 30 days.","reason":"Continue current regimen. Refill due in 3 days."},
    {"name":"Rajesh Khanna","age":70,"phone":"+91 99001 88227","conds":["Diabetes"],"score":32,"sev":"low","sum":"Well controlled. No symptoms reported.","reason":"Quarterly HbA1c uploaded; values within target."}
  ]'::jsonb;
begin
  if exists (select 1 from public.patients where name = 'Ravi Kumar') then
    return;
  end if;
  for rec in select value from jsonb_array_elements(seed_rows)
  loop
    insert into public.patients (name, age, phone, condition_tags)
    values (rec->>'name', (rec->>'age')::int, rec->>'phone', array(select jsonb_array_elements_text(rec->'conds')))
    returning id into pid;

    insert into public.priority_scores (patient_id, score, updated_at)
    values (pid, (rec->>'score')::int, now());

    insert into public.triage_results (patient_id, summary, reasoning, severity, created_at)
    values (pid, rec->>'sum', rec->>'reason', rec->>'sev', now() - (random() * interval '6 days'));
  end loop;

  insert into public.doctors (name, phone)
  select 'Dr. Anita Sharma', '+91 98200 00000'
  where not exists (select 1 from public.doctors where name = 'Dr. Anita Sharma');
end $$;
