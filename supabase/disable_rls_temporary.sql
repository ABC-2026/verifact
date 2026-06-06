-- ============================================================================
-- TEMPORARY WORKAROUND: Disable RLS entirely for demo (INSECURE - demo only!)
-- ============================================================================
-- This disables RLS on all tables, allowing anon key full access.
-- Use this ONLY for testing. Re-enable RLS before production.
--
-- To apply:
-- 1. Go to: https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new
-- 2. Copy this ENTIRE block (from "do $$" to "end $$;")
-- 3. Click "Run"
-- 4. Refresh the app at http://localhost:8080/
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'patients','priority_scores','triage_results','voice_notes',
    'prescriptions','doctors','doctor_patients','care_circles',
    'patient_baselines','notifications'
  ] loop
    -- Temporarily disable RLS to allow anon access
    execute format('alter table public.%I disable row level security', t);
  end loop;
end $$;

-- Verify: should see "enabled = false" for all tables
select tablename, rowsecurity as rls_enabled 
from pg_tables 
where schemaname = 'public' 
  and tablename in ('patients','priority_scores','triage_results','voice_notes','prescriptions','doctors');
