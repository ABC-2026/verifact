const SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZ2JycGl0a2tocGxmd2ZtcnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzI4MywiZXhwIjoyMDk2MjMzMjgzfQ.ALS7wpddGonaCMyJkB15_n0YtpaO_XbJgKQMEB6UDIk';

// Individual SQL commands to enable RLS on tables and create permissive policies
const tables = ['patients','priority_scores','triage_results','voice_notes','prescriptions','doctors','doctor_patients','care_circles','patient_baselines','notifications'];

async function executeSQL(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ sql }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function run() {
  console.log('Applying RLS policies via HTTP...\n');

  // Try to enable RLS and create permissive policies
  let succeededCount = 0;

  for (const table of tables) {
    // Enable RLS
    console.log(`Setting up ${table}...`);
    
    const enableRLS = await executeSQL(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    if (!enableRLS.ok) {
      console.log(`  ⚠️  Could not enable RLS: ${enableRLS.error.substring(0, 100)}`);
      continue;
    }

    // Create permissive select policy
    const selectPolicy = await executeSQL(
      `CREATE POLICY "demo_all_select" ON public.${table} FOR SELECT TO anon, authenticated USING (true);`
    );
    if (!selectPolicy.ok) {
      console.log(`  ⚠️  Could not create select policy: ${selectPolicy.error.substring(0, 100)}`);
      continue;
    }

    // Create permissive insert policy
    const insertPolicy = await executeSQL(
      `CREATE POLICY "demo_all_insert" ON public.${table} FOR INSERT TO anon, authenticated WITH CHECK (true);`
    );
    if (!insertPolicy.ok) {
      console.log(`  ⚠️  Could not create insert policy: ${insertPolicy.error.substring(0, 100)}`);
      continue;
    }

    // Create permissive update policy
    const updatePolicy = await executeSQL(
      `CREATE POLICY "demo_all_update" ON public.${table} FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);`
    );
    if (!updatePolicy.ok) {
      console.log(`  ⚠️  Could not create update policy: ${updatePolicy.error.substring(0, 100)}`);
      continue;
    }

    // Create permissive delete policy
    const deletePolicy = await executeSQL(
      `CREATE POLICY "demo_all_delete" ON public.${table} FOR DELETE TO anon, authenticated USING (true);`
    );
    if (!deletePolicy.ok) {
      console.log(`  ⚠️  Could not create delete policy: ${deletePolicy.error.substring(0, 100)}`);
      continue;
    }

    console.log(`  ✓ ${table}`);
    succeededCount++;
  }

  console.log(`\n✅ RLS policies set on ${succeededCount}/${tables.length} tables`);
  console.log('\nVerifying anon access...');

  // Test with anon key
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?select=id,name&limit=3`,
    {
      method: 'GET',
      headers: {
        'apikey': 'sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79',
      },
    }
  );

  const data = await response.json();
  console.log(`Status: ${response.status}`);
  console.log(`Patients (anon): ${Array.isArray(data) ? data.length : 0} rows`);
  if (Array.isArray(data) && data.length > 0) {
    console.log(`  - ${data.map(p => p.name).join(', ')}`);
    console.log('\n✅ SUCCESS! Anon key can now read patients.');
  }
}

run().catch((e) => { console.error('FATAL:', e); process.exit(1); });
