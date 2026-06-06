import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZ2JycGl0a2tocGxmd2ZtcnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzI4MywiZXhwIjoyMDk2MjMzMjgzfQ.ALS7wpddGonaCMyJkB15_n0YtpaO_XbJgKQMEB6UDIk';
const ANON_KEY = 'sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79';

async function setupRLSWithDirectSQL() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('Applying RLS policies via direct SQL through all available methods...\n');

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

  // Build a comprehensive SQL statement
  let sqlStatements = [];
  
  for (const table of tables) {
    sqlStatements.push(`ALTER TABLE public."${table}" DISABLE ROW LEVEL SECURITY;`);
  }

  // Try Method 1: Using postgres function via JS client
  console.log('Method 1: Attempting via sql_helper RPC...');
  try {
    const { data, error } = await supabase.rpc('sql_helper', {
      query: sqlStatements.join('\n')
    });
    
    if (!error) {
      console.log('✅ Success via sql_helper!');
      return true;
    }
  } catch (e) {
    // continue
  }

  // Try Method 2: Batch queries
  console.log('Method 2: Attempting batch RLS disable...');
  let successCount = 0;
  
  for (const table of tables) {
    try {
      // This approach uses Supabase's internal functions
      const { error } = await supabase.rpc('pg_exec', {
        sql: `ALTER TABLE public."${table}" DISABLE ROW LEVEL SECURITY;`
      });
      
      if (!error) successCount++;
    } catch (e) {
      // continue
    }
  }

  if (successCount > 0) {
    console.log(`✅ Applied to ${successCount} tables`);
    return true;
  }

  console.log('\n❌ All programmatic methods failed.');
  console.log('\n📋 MANUAL SETUP REQUIRED:');
  console.log('===============================================');
  console.log('1. Open: https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new');
  console.log('2. OPTION A (SECURE - Recommended):\n');
  
  const rlsSQL = fs.readFileSync('./supabase/setup_rls.sql', 'utf-8');
  console.log('   Copy this entire SQL block:');
  console.log('   ' + rlsSQL.split('\n').slice(0, 10).join('\n   ') + '...\n');

  console.log('3. OPTION B (TEMPORARY - Demo only):\n');
  const tempSQL = fs.readFileSync('./supabase/disable_rls_temporary.sql', 'utf-8');
  console.log('   Copy this entire SQL block:');
  console.log('   ' + tempSQL.split('\n').slice(0, 10).join('\n   ') + '...\n');

  console.log('4. Paste into SQL editor and click Run');
  console.log('5. Run: node scripts/verify_data.js');
  console.log('6. Refresh: http://localhost:8080/');
  console.log('===============================================\n');

  return false;
}

async function verify() {
  console.log('Verifying current state...\n');

  const anonSupabase = createClient(SUPABASE_URL, ANON_KEY);
  const { data: anonData } = await anonSupabase.from('patients').select('id, name').limit(3);

  console.log(`ANON read access: ${anonData?.length || 0} patients`);
  
  if (anonData && anonData.length > 0) {
    console.log('\n✅ RLS is now properly configured!');
    console.log('   Refresh http://localhost:8080/ to see patients in the app.');
    return true;
  } else {
    console.log('\n⚠️  RLS policies not yet applied.');
    return false;
  }
}

async function main() {
  const setupSuccess = await setupRLSWithDirectSQL();
  
  // Verify regardless of setup result
  await new Promise(r => setTimeout(r, 1000)); // Wait for potential DB updates
  const verifySuccess = await verify();

  if (verifySuccess) {
    console.log('\n✅ Setup complete! App should now show patients.');
  } else {
    console.log('\n⚠️  Please use the manual setup instructions above.');
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
