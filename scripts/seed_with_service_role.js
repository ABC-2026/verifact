import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZ2JycGl0a2tocGxmd2ZtcnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzI4MywiZXhwIjoyMDk2MjMzMjgzfQ.ALS7wpddGonaCMyJkB15_n0YtpaO_XbJgKQMEB6UDIk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const seedData = [
  {"name":"Ravi Kumar","age":62,"phone":"+91 98201 11122","conds":["Type 2 Diabetes","Hypertension"],"score":92,"sev":"high","sum":"Composite risk has risen sharply over the last 14 days driven by uncontrolled fasting glucose (avg 184 mg/dL) and sustained BP elevation (avg 162/98).","reason":"Two self-reported dizziness episodes in the last 72h. Adherence trending down. Recommend tele-consult within 24h and consider medication titration."},
  {"name":"Lakshmi Iyer","age":58,"phone":"+91 98765 43210","conds":["CHF","Diabetes"],"score":88,"sev":"high","sum":"CHF exacerbation risk elevated. Weight gain of 1.8 kg over 5 days suggests fluid retention.","reason":"HbA1c trending up. Diuretic adherence inconsistent. Escalate to cardiology review."},
  {"name":"Mohammed Arif","age":71,"phone":"+91 99830 22014","conds":["COPD","Hypertension"],"score":84,"sev":"high","sum":"SpO2 dropped to 89% twice this week. Increased rescue inhaler use.","reason":"Likely COPD flare. Consider short course of oral steroids and pulmonary follow-up."},
  {"name":"Priya Menon","age":49,"phone":"+91 90345 56712","conds":["Type 2 Diabetes"],"score":71,"sev":"moderate","sum":"Fasting glucose 184 mg/dL for 3rd consecutive day. Otherwise stable vitals.","reason":"Reinforce dietary counseling and review evening metformin timing."},
  {"name":"Sanjay Patel","age":66,"phone":"+91 98980 71156","conds":["Post-MI","Hyperlipidemia"],"score":68,"sev":"moderate","sum":"Missed evening statin dose 2 of last 5 days. Lipid panel mildly above target.","reason":"Adherence counseling; no acute symptoms reported."},
  {"name":"Aarti Deshpande","age":54,"phone":"+91 91670 34988","conds":["Hypertension"],"score":64,"sev":"moderate","sum":"Skipped weekly check-in survey. Last BP reading borderline (148/94).","reason":"Outreach to confirm patient status; schedule routine follow-up."},
  {"name":"Vikram Reddy","age":60,"phone":"+91 99490 99281","conds":["Diabetes","CKD Stage 3"],"score":59,"sev":"moderate","sum":"eGFR stable at 42. Glycemic control adequate this month.","reason":"Continue current regimen. Schedule nephrology review in 6 weeks."},
  {"name":"Suresh Nair","age":45,"phone":"+91 95440 11003","conds":["Hypertension"],"score":52,"sev":"moderate","sum":"BP within target on most days but morning spikes noted.","reason":"Consider shifting amlodipine to evening dose."},
  {"name":"Meera Kapoor","age":63,"phone":"+91 98113 56441","conds":["Diabetes","Hypothyroid"],"score":51,"sev":"moderate","sum":"TSH within range. Postprandial glucose mildly elevated.","reason":"Reinforce post-meal walks; recheck HbA1c in 8 weeks."},
  {"name":"Arjun Nair","age":41,"phone":"+91 90873 12005","conds":["Hypertension","Obesity"],"score":44,"sev":"low","sum":"Weight stable. BP trending down with current regimen.","reason":"Continue lifestyle plan. Quarterly review."},
  {"name":"Neha Sharma","age":45,"phone":"+91 98101 23456","conds":["Hypertension"],"score":38,"sev":"low","sum":"All readings within target range over the last 30 days.","reason":"Continue current regimen. Refill due in 3 days."},
  {"name":"Rajesh Khanna","age":70,"phone":"+91 99001 88227","conds":["Diabetes"],"score":32,"sev":"low","sum":"Well controlled. No symptoms reported.","reason":"Quarterly HbA1c uploaded; values within target."}
];

async function run() {
  console.log('Seeding database via Supabase service_role client...\n');

  // First check if data already exists
  const { count: existingCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });
  
  if (existingCount > 0) {
    console.log(`✓ Database already seeded (${existingCount} patients found). Skipping.`);
    return;
  }

  // Insert doctor first
  console.log('Inserting doctor...');
  const { data: doctorData, error: doctorError } = await supabase
    .from('doctors')
    .insert({ name: 'Dr. Anita Sharma', phone: '+91 98200 00000' })
    .select('id');
  
  if (doctorError) {
    console.error('Error inserting doctor:', doctorError);
    process.exit(1);
  }
  const doctorId = doctorData[0]?.id;
  console.log(`✓ Doctor inserted: ${doctorId}`);

  // Insert patients, priority_scores, and triage_results
  let successCount = 0;
  for (const rec of seedData) {
    // Insert patient
    const { data: patData, error: patError } = await supabase
      .from('patients')
      .insert({
        name: rec.name,
        age: rec.age,
        phone: rec.phone,
        condition_tags: rec.conds,
      })
      .select('id');

    if (patError) {
      console.error(`Error inserting patient ${rec.name}:`, patError);
      continue;
    }

    const patId = patData[0]?.id;
    console.log(`✓ Patient: ${rec.name} (${patId})`);

    // Insert priority_score
    const { error: scoreError } = await supabase
      .from('priority_scores')
      .insert({
        patient_id: patId,
        score: rec.score,
        updated_at: new Date().toISOString(),
      });

    if (scoreError) {
      console.error(`  Warning: Error inserting priority_score for ${rec.name}:`, scoreError);
    }

    // Insert triage_result
    const { error: triageError } = await supabase
      .from('triage_results')
      .insert({
        patient_id: patId,
        summary: rec.sum,
        reasoning: rec.reason,
        severity: rec.sev,
        created_at: new Date().toISOString(),
      });

    if (triageError) {
      console.error(`  Warning: Error inserting triage_result for ${rec.name}:`, triageError);
    }

    successCount++;
  }

  console.log(`\n✅ Seeding complete: ${successCount}/${seedData.length} patients inserted.`);

  // Verify data is readable
  console.log('\nVerifying data with service_role client...');
  const { data: patients } = await supabase.from('patients').select('id, name, age').limit(3);
  console.log(`✓ Fetched ${patients.length} patients (service_role):`, patients.map(p => p.name).join(', '));

  // Verify data is readable with ANON key
  console.log('\nVerifying data with anon key...');
  const anonSupabase = createClient(SUPABASE_URL, 'sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79');
  const { data: anonPatients } = await anonSupabase.from('patients').select('id, name, age').limit(3);
  console.log(`✓ Fetched ${anonPatients.length} patients (anon):`, anonPatients.map(p => p.name).join(', '));

  console.log('\n✅ Database ready! Refresh the app at http://localhost:8080/');
}

run().catch((e) => { console.error('FATAL:', e); process.exit(1); });
