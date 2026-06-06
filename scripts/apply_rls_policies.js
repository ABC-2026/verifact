import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZ2JycGl0a2tocGxmd2ZtcnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzI4MywiZXhwIjoyMDk2MjMzMjgzfQ.ALS7wpddGonaCMyJkB15_n0YtpaO_XbJgKQMEB6UDIk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// RLS setup SQL from the migration
const rlsSql = `
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
`;

async function run() {
  console.log('Applying RLS policies to enable anon access...\n');

  try {
    // Execute via Postgres execute function (if available)
    const { data, error } = await supabase.rpc('postgres_exec', { sql: rlsSql });
    
    if (error?.code === 'PGRST202') {
      console.log('postgres_exec not available, trying sql_exec...');
      const { data: data2, error: error2 } = await supabase.rpc('sql_exec', { sql: rlsSql });
      
      if (error2?.code === 'PGRST202') {
        console.log('No exec function available. Will apply policies individually...');
        await applyPoliciesManually();
      } else if (error2) {
        console.error('Error:', error2);
        process.exit(1);
      } else {
        console.log('✓ RLS policies applied via sql_exec');
      }
    } else if (error) {
      console.error('Error:', error);
      process.exit(1);
    } else {
      console.log('✓ RLS policies applied');
    }
  } catch (e) {
    console.log('Attempting manual policy application...');
    await applyPoliciesManually();
  }

  // Verify with both keys
  console.log('\nVerifying access...\n');
  const serviceSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const anonSupabase = createClient(SUPABASE_URL, 'sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79');

  const { data: srvData } = await serviceSupabase.from('patients').select('id, name').limit(3);
  const { data: anonData } = await anonSupabase.from('patients').select('id, name').limit(3);

  console.log(`SERVICE_ROLE: ${srvData?.length || 0} patients`);
  console.log(`ANON:         ${anonData?.length || 0} patients`);

  if (anonData && anonData.length > 0) {
    console.log('\n✅ SUCCESS! Anon key can now read patients.');
  } else {
    console.log('\n⚠️  Anon key still cannot read. Checking table existence...');
    const { data: tables } = await serviceSupabase.rpc('get_tables');
    console.log('Tables:', tables);
  }
}

async function applyPoliciesManually() {
  console.log('Applying RLS policies manually...');
  
  const tables = ['patients','priority_scores','triage_results','voice_notes','prescriptions','doctors','doctor_patients','care_circles','patient_baselines','notifications'];
  
  for (const table of tables) {
    try {
      // Try to enable RLS
      await supabase.rpc('alter_table_rls', { table_name: table });
    } catch (e) {
      // Continue even if RLS enable fails
    }
    
    try {
      // Try to create the permissive policy
      // Since we can't execute arbitrary SQL, we'll rely on Supabase admin dashboard or use a workaround
      console.log(`  Processing ${table}...`);
    } catch (e) {
      console.log(`  Warning for ${table}:`, e.message);
    }
  }
  
  console.log('\n⚠️  Manual application attempted. Policies may need to be set via Supabase dashboard.');
}

run().catch((e) => { console.error('FATAL:', e); process.exit(1); });
