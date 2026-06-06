-- ============================================================
-- Verifact: Doctor-Patient Messaging — Complete Setup Script
-- Paste this entire block into Supabase SQL Editor and Run.
-- Safe to re-run (all operations are idempotent).
-- ============================================================


-- ── STEP 1: Create conversations table ──────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id  UUID        NOT NULL REFERENCES public.doctors(id)  ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ── STEP 2: Create messages table ───────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type     TEXT        NOT NULL CHECK (sender_type IN ('doctor', 'patient')),
  sender_id       UUID        NOT NULL,
  message         TEXT        NOT NULL,
  is_read         BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ── STEP 3: Indexes ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON public.messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_doctor
  ON public.conversations (doctor_id);

CREATE INDEX IF NOT EXISTS idx_conversations_patient
  ON public.conversations (patient_id);


-- ── STEP 4: Row Level Security (open for MVP demo) ──────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['conversations', 'messages'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "demo_all_select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_all_insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_all_update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_all_delete" ON public.%I', t);

    EXECUTE format('CREATE POLICY "demo_all_select" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "demo_all_insert" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "demo_all_update" ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "demo_all_delete" ON public.%I FOR DELETE TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;


-- ── STEP 5: Seed demo conversations ─────────────────────────

DO $$
DECLARE
  v_doctor_id  UUID;
  v_ravi_id    UUID;
  v_lakshmi_id UUID;
  v_conv1_id   UUID;
  v_conv2_id   UUID;
BEGIN

  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM public.conversations LIMIT 1) THEN
    RAISE NOTICE 'Seed skipped — conversations table already has data.';
    RETURN;
  END IF;

  -- Get or create doctor
  SELECT id INTO v_doctor_id FROM public.doctors LIMIT 1;
  IF v_doctor_id IS NULL THEN
    INSERT INTO public.doctors (name, phone)
    VALUES ('Dr. Anita Sharma', '+91 98200 00000')
    RETURNING id INTO v_doctor_id;
    RAISE NOTICE 'Created doctor: Dr. Anita Sharma';
  ELSE
    RAISE NOTICE 'Using existing doctor id: %', v_doctor_id;
  END IF;

  -- Get or create Ravi Kumar
  SELECT id INTO v_ravi_id
    FROM public.patients WHERE name ILIKE '%Ravi%' LIMIT 1;
  IF v_ravi_id IS NULL THEN
    INSERT INTO public.patients (name, age, phone, condition_tags)
    VALUES ('Ravi Kumar', 62, '+91 98201 11122',
            ARRAY['Type 2 Diabetes', 'Hypertension'])
    RETURNING id INTO v_ravi_id;
    INSERT INTO public.priority_scores (patient_id, score, updated_at)
    VALUES (v_ravi_id, 92, now());
    RAISE NOTICE 'Created patient: Ravi Kumar';
  ELSE
    RAISE NOTICE 'Using existing patient Ravi id: %', v_ravi_id;
  END IF;

  -- Get or create Lakshmi
  SELECT id INTO v_lakshmi_id
    FROM public.patients WHERE name ILIKE '%Lakshmi%' LIMIT 1;
  IF v_lakshmi_id IS NULL THEN
    INSERT INTO public.patients (name, age, phone, condition_tags)
    VALUES ('Lakshmi Iyer', 58, '+91 98765 43210',
            ARRAY['CHF', 'Diabetes'])
    RETURNING id INTO v_lakshmi_id;
    INSERT INTO public.priority_scores (patient_id, score, updated_at)
    VALUES (v_lakshmi_id, 88, now());
    RAISE NOTICE 'Created patient: Lakshmi Iyer';
  ELSE
    RAISE NOTICE 'Using existing patient Lakshmi id: %', v_lakshmi_id;
  END IF;

  -- ── Conversation 1: Ravi Kumar ───────────────────────────
  INSERT INTO public.conversations
    (patient_id, doctor_id, status, created_at, updated_at)
  VALUES
    (v_ravi_id, v_doctor_id, 'open',
     now() - INTERVAL '3 hours',
     now() - INTERVAL '1 hour')
  RETURNING id INTO v_conv1_id;

  INSERT INTO public.messages
    (conversation_id, sender_type, sender_id, message, is_read, created_at)
  VALUES
    (v_conv1_id, 'patient', v_ravi_id,
     'I have been feeling dizzy for the last two days. Should I be worried?',
     TRUE,  now() - INTERVAL '3 hours'),

    (v_conv1_id, 'doctor',  v_doctor_id,
     'Please monitor your blood sugar and send me tomorrow''s readings. If dizziness worsens, call the clinic immediately.',
     FALSE, now() - INTERVAL '2 hours'),

    (v_conv1_id, 'patient', v_ravi_id,
     'My fasting glucose was 218 mg/dL this morning and BP was 162/98. Feeling a bit better now.',
     FALSE, now() - INTERVAL '1 hour');

  -- ── Conversation 2: Lakshmi ──────────────────────────────
  INSERT INTO public.conversations
    (patient_id, doctor_id, status, created_at, updated_at)
  VALUES
    (v_lakshmi_id, v_doctor_id, 'open',
     now() - INTERVAL '5 hours',
     now() - INTERVAL '2 hours')
  RETURNING id INTO v_conv2_id;

  INSERT INTO public.messages
    (conversation_id, sender_type, sender_id, message, is_read, created_at)
  VALUES
    (v_conv2_id, 'patient', v_lakshmi_id,
     'I missed one medication dose yesterday by accident. Should I double up today?',
     TRUE,  now() - INTERVAL '5 hours'),

    (v_conv2_id, 'doctor', v_doctor_id,
     'Resume your medication schedule and monitor your BP. Do NOT double up on any dose.',
     TRUE,  now() - INTERVAL '4 hours'),

    (v_conv2_id, 'patient', v_lakshmi_id,
     'Understood. My BP this morning is 145/90. Feeling a bit breathless but manageable.',
     FALSE, now() - INTERVAL '2 hours');

  -- ── Notifications ────────────────────────────────────────
  INSERT INTO public.notifications (message, created_at, read_at) VALUES
    ('Ravi Kumar sent you a message about dizziness — please review.',
     now() - INTERVAL '1 hour', NULL),
    ('Lakshmi Iyer sent you an update about her BP readings.',
     now() - INTERVAL '2 hours', NULL);

  RAISE NOTICE 'Seed complete: 2 conversations, 6 messages, 2 notifications.';
END $$;


-- ── STEP 6: Verify ───────────────────────────────────────────

SELECT 'conversations' AS "table", COUNT(*)::int AS "rows" FROM public.conversations
UNION ALL
SELECT 'messages',                  COUNT(*)::int             FROM public.messages;

SELECT
  p.name        AS patient,
  d.name        AS doctor,
  c.status,
  COUNT(m.id)   AS message_count,
  MAX(m.created_at)::timestamptz(0) AS last_message_at
FROM public.conversations c
JOIN public.patients p ON p.id = c.patient_id
JOIN public.doctors  d ON d.id = c.doctor_id
LEFT JOIN public.messages m ON m.conversation_id = c.id
GROUP BY p.name, d.name, c.status
ORDER BY last_message_at DESC;
