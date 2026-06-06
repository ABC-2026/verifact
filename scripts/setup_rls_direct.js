import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZ2JycGl0a2tocGxmd2ZtcnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzI4MywiZXhwIjoyMDk2MjMzMjgzfQ.ALS7wpddGonaCMyJkB15_n0YtpaO_XbJgKQMEB6UDIk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec', { sql });
    return { success: !error, error, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function setupRLS() {
  console.log('Setting up RLS policies for Verifact demo...\n');

  const tables = [
    'patients',
    'priority_scores',
    'triage_results',
    'voice_notes',
    'prescriptions',
    'doctors',
    'doctor_patients',
    'care_circles',
    'patient_baselines',
    'notifications'
  ];

  let successCount = 0;

  for (const table of tables) {
    console.log(`Configuring ${table}...`);

    // Enable RLS
    const rlsResult = await executeSQL(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    if (rlsResult.error) {
      console.log(`  ⚠️  RLS enable: ${rlsResult.error.message?.substring(0, 80) || 'unknown error'}`);
    } else {
      console.log(`  ✓ RLS enabled`);
    }

    // Grant permissions
    const grantResult = await executeSQL(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON public.${table} TO anon, authenticated;`
    );
    if (grantResult.error) {
      console.log(`  ⚠️  Grant: ${grantResult.error.message?.substring(0, 80) || 'unknown error'}`);
    } else {
      console.log(`  ✓ Granted anon/authenticated permissions`);
    }

    // Drop old policies
    await executeSQL(`DROP POLICY IF EXISTS "demo_all_select" ON public.${table};`);
    await executeSQL(`DROP POLICY IF EXISTS "demo_all_insert" ON public.${table};`);
    await executeSQL(`DROP POLICY IF EXISTS "demo_all_update" ON public.${table};`);
    await executeSQL(`DROP POLICY IF EXISTS "demo_all_delete" ON public.${table};`);

    // Create SELECT policy
    const selectPolicy = await executeSQL(
      `CREATE POLICY "demo_all_select" ON public.${table} FOR SELECT TO anon, authenticated USING (true);`
    );
    if (selectPolicy.error) {
      console.log(`  ⚠️  SELECT policy: ${selectPolicy.error.message?.substring(0, 80) || 'unknown error'}`);
    }

    // Create INSERT policy
    const insertPolicy = await executeSQL(
      `CREATE POLICY "demo_all_insert" ON public.${table} FOR INSERT TO anon, authenticated WITH CHECK (true);`
    );
    if (insertPolicy.error) {
      console.log(`  ⚠️  INSERT policy: ${insertPolicy.error.message?.substring(0, 80) || 'unknown error'}`);
    }

    // Create UPDATE policy
    const updatePolicy = await executeSQL(
      `CREATE POLICY "demo_all_update" ON public.${table} FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);`
    );
    if (updatePolicy.error) {
      console.log(`  ⚠️  UPDATE policy: ${updatePolicy.error.message?.substring(0, 80) || 'unknown error'}`);
    }

    // Create DELETE policy
    const deletePolicy = await executeSQL(
      `CREATE POLICY "demo_all_delete" ON public.${table} FOR DELETE TO anon, authenticated USING (true);`
    );
    if (deletePolicy.error) {
      console.log(`  ⚠️  DELETE policy: ${deletePolicy.error.message?.substring(0, 80) || 'unknown error'}`);
    }

    if (!selectPolicy.error && !insertPolicy.error && !updatePolicy.error && !deletePolicy.error) {
      console.log(`  ✓ ${table} complete`);
      successCount++;
    }
  }

  console.log(`\n✅ RLS setup complete: ${successCount}/${tables.length} tables configured`);

  // Final verification
  console.log('\nVerifying access with anon key...');
  const anonSupabase = createClient(SUPABASE_URL, 'sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79');
  const { data: anonPatients } = await anonSupabase.from('patients').select('id, name, age').limit(5);

  console.log(`Anon key can now read: ${anonPatients?.length || 0} patients`);
  if (anonPatients && anonPatients.length > 0) {
    anonPatients.forEach(p => console.log(`  - ${p.name} (age ${p.age})`));
    console.log('\n✅ SUCCESS! The app should now display patients.');
    console.log('   Refresh http://localhost:8080/ to see the patient queue.');
  } else {
    console.log('\n⚠️  Anon access still not working. Please apply RLS manually via dashboard:');
    console.log('   https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new');
    console.log('   Copy and paste the SQL from: supabase/setup_rls.sql');
  }
}

setupRLS().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
