import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZ2JycGl0a2tocGxmd2ZtcnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzI4MywiZXhwIjoyMDk2MjMzMjgzfQ.ALS7wpddGonaCMyJkB15_n0YtpaO_XbJgKQMEB6UDIk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  console.log('Reading migration file...');
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260606070000_open_rls_and_seed.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration via Supabase Admin SQL endpoint...');
  try {
    const { data, error } = await supabase.rpc('exec_raw_sql', {
      sql: migrationSQL,
    });
    
    if (error) {
      console.error('Migration failed via rpc:', error);
      console.log('\nAttempting direct REST call instead...');
      
      // Try direct REST call as fallback
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ sql: migrationSQL }),
      });

      if (!response.ok) {
        console.error(`REST call failed: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error('Response:', text);
        process.exit(1);
      }
      console.log('Migration applied successfully via REST.');
    } else {
      console.log('Migration applied successfully via RPC.');
    }
  } catch (e) {
    console.error('Error executing migration:', e.message);
    process.exit(1);
  }

  // Verify data was seeded
  console.log('\nVerifying seeded data...');
  const { data: patients, error: pErr } = await supabase.from('patients').select('id, name').limit(3);
  if (pErr) {
    console.error('Error fetching patients:', pErr);
  } else {
    console.log(`✓ Patients seeded: ${patients.length} rows`);
    patients.forEach(p => console.log(`  - ${p.name}`));
  }

  const { data: doctors, error: dErr } = await supabase.from('doctors').select('id, name').limit(3);
  if (dErr) {
    console.error('Error fetching doctors:', dErr);
  } else {
    console.log(`✓ Doctors seeded: ${doctors.length} rows`);
    doctors.forEach(d => console.log(`  - ${d.name}`));
  }

  const { data: triage, error: tErr } = await supabase.from('triage_results').select('id, patient_id, severity').limit(3);
  if (tErr) {
    console.error('Error fetching triage_results:', tErr);
  } else {
    console.log(`✓ Triage results seeded: ${triage.length} rows`);
  }

  console.log('\n✅ Migration complete. Data should now be readable by anon key.');
}

run().catch((e) => { console.error('FATAL:', e); process.exit(1); });
