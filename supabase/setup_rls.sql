-- ============================================================================
-- SUPABASE RLS POLICY SETUP - Copy this entire file into Supabase SQL Editor
-- ============================================================================
-- This enables Row Level Security on all demo tables and creates permissive
-- policies so that the anon key can read/write data.
--
-- Steps:
-- 1. Go to: https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new
-- 2. Copy this entire SQL below (from "do $$" to "end $$;")
-- 3. Click "Run" or press Ctrl+Enter
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
    -- Enable RLS on the table
    execute format('alter table public.%I enable row level security', t);
    
    -- Drop existing demo policies (if any)
    execute format('drop policy if exists "demo_all_select" on public.%I', t);
    execute format('drop policy if exists "demo_all_insert" on public.%I', t);
    execute format('drop policy if exists "demo_all_update" on public.%I', t);
    execute format('drop policy if exists "demo_all_delete" on public.%I', t);
    
    -- Grant permissions to anon and authenticated roles
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    
    -- Create permissive policies (allow all actions via anon/authenticated)
    execute format('create policy "demo_all_select" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "demo_all_insert" on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('create policy "demo_all_update" on public.%I for update to anon, authenticated using (true) with check (true)', t);
    execute format('create policy "demo_all_delete" on public.%I for delete to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Verify RLS is enabled
select tablename, (tablename in (select tablename from pg_tables where schemaname = 'public' 
  and exists (select 1 from pg_policies where pg_policies.tablename = pg_tables.tablename))) as has_policies
from pg_tables where schemaname = 'public' 
  and tablename in ('patients','priority_scores','triage_results','voice_notes','prescriptions','doctors');
