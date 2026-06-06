import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Supabase URL:', SUPABASE_URL);

  const q1 = await supabase.from('patients').select('id, name, age, phone, condition_tags, created_at, priority_scores(score)');
  console.log('\n=== patients query ===');
  console.log('status / error:', q1.error);
  console.log('data length:', Array.isArray(q1.data) ? q1.data.length : typeof q1.data);
  console.log('data sample:', JSON.stringify(q1.data, null, 2));

  const q2 = await supabase.from('priority_scores').select('*');
  console.log('\n=== priority_scores query ===');
  console.log('status / error:', q2.error);
  console.log('data length:', Array.isArray(q2.data) ? q2.data.length : typeof q2.data);
  console.log('data sample:', JSON.stringify(q2.data, null, 2));

  const q3 = await supabase.from('triage_results').select('*').limit(5);
  console.log('\n=== triage_results query ===');
  console.log('status / error:', q3.error);
  console.log('data length:', Array.isArray(q3.data) ? q3.data.length : typeof q3.data);
  console.log('data sample:', JSON.stringify(q3.data, null, 2));

  const q4 = await supabase.from('doctors').select('*').limit(5);
  console.log('\n=== doctors query ===');
  console.log('status / error:', q4.error);
  console.log('data length:', Array.isArray(q4.data) ? q4.data.length : typeof q4.data);
  console.log('data sample:', JSON.stringify(q4.data, null, 2));
}

run().catch((e) => { console.error('DIAG ERROR', e); process.exit(1); });
