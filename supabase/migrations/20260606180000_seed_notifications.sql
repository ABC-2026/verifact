-- Seed realistic demo notifications for the Verifact alerts panel.
-- Only runs if no notifications exist yet (idempotent).

do $$
begin
  if exists (select 1 from public.notifications limit 1) then
    return;
  end if;

  insert into public.notifications (message, created_at, read_at) values
    ('Ravi Kumar: Fasting glucose spiked to 212 mg/dL — 3rd consecutive high reading. Consider medication review.', now() - interval '2 hours', null),
    ('Lakshmi Iyer: Weight gain of 1.8 kg in 5 days. Possible fluid retention — CHF exacerbation risk elevated.', now() - interval '5 hours', null),
    ('Mohammed Arif: SpO₂ dropped to 87% at 11:42 PM. Rescue inhaler used twice today. COPD flare suspected.', now() - interval '9 hours', null),
    ('Priya Menon: Missed last 2 medication check-ins. Adherence tracking shows 3-day gap.', now() - interval '1 day', null),
    ('Sanjay Patel: Evening statin dose missed on 3 of the last 5 days. Lipid panel follow-up recommended.', now() - interval '1 day 4 hours', null),
    ('Aarti Deshpande: Skipped weekly check-in survey. Last BP reading: 148/94 mmHg — borderline.', now() - interval '2 days', null),
    ('Ravi Kumar: Blood pressure 168/102 mmHg recorded at home. Sustained hypertensive episode — review antihypertensive.', now() - interval '2 days 6 hours', now() - interval '1 day'),
    ('Vikram Reddy: Routine eGFR lab results uploaded — stable at 42. Nephrology review due in 6 weeks.', now() - interval '3 days', now() - interval '2 days'),
    ('Neha Sharma: Prescription refill due in 3 days. Auto-reminder sent to patient.', now() - interval '4 days', now() - interval '3 days'),
    ('Rajesh Khanna: Quarterly HbA1c result received — 6.8%, within target range. No action needed.', now() - interval '5 days', now() - interval '4 days');
end $$;
