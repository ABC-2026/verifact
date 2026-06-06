import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZ2JycGl0a2tocGxmd2ZtcnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzI4MywiZXhwIjoyMDk2MjMzMjgzfQ.ALS7wpddGonaCMyJkB15_n0YtpaO_XbJgKQMEB6UDIk';
const ANON_KEY = 'sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79';

async function run() {
  console.log('=== SUPABASE DATA VERIFICATION ===\n');

  // Service role check
  console.log('>> SERVICE_ROLE client:');
  const serviceSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  
  const { data: srvPatients, error: srvPatErr } = await serviceSupabase
    .from('patients')
    .select('id, name, age, priority_scores(score)');
  
  console.log(`Patients: ${srvPatients?.length || 0} rows`);
  if (srvPatients) {
    srvPatients.forEach(p => {
      const score = p.priority_scores?.[0]?.score || 'N/A';
      console.log(`  - ${p.name} (age ${p.age}, score ${score})`);
    });
  }
  if (srvPatErr) console.error('  ERROR:', srvPatErr.message);

  // Anon key check
  console.log('\n>> ANON client:');
  const anonSupabase = createClient(SUPABASE_URL, ANON_KEY);
  
  const { data: anonPatients, error: anonPatErr } = await anonSupabase
    .from('patients')
    .select('id, name, age, priority_scores(score)');
  
  console.log(`Patients: ${anonPatients?.length || 0} rows`);
  if (anonPatients) {
    anonPatients.forEach(p => {
      const score = p.priority_scores?.[0]?.score || 'N/A';
      console.log(`  - ${p.name} (age ${p.age}, score ${score})`);
    });
  }
  if (anonPatErr) console.error('  ERROR:', anonPatErr.message);

  // Check RLS policies
  console.log('\n>> Checking RLS Policies (service_role):');
  const { data: policies, error: polErr } = await serviceSupabase
    .rpc('get_rls_info');
  
  if (polErr) {
    console.log('  (RLS query not available, but data reads should work)');
  } else {
    console.log('  Policies found:', policies?.length || 0);
  }

  console.log('\n✅ Verification complete.');
}

run().catch((e) => { console.error('FATAL:', e); process.exit(1); });
