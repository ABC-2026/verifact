const SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZ2JycGl0a2tocGxmd2ZtcnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzI4MywiZXhwIjoyMDk2MjMzMjgzfQ.ALS7wpddGonaCMyJkB15_n0YtpaO_XbJgKQMEB6UDIk';

async function applySingleStatement(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
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

async function setupViaRestAPI() {
  console.log('Attempting to apply RLS via REST API...\n');

  const sql = `
    do $$
    declare t text;
    begin
      foreach t in array array['patients','priority_scores','triage_results','voice_notes','prescriptions','doctors','doctor_patients','care_circles','patient_baselines','notifications'] loop
        execute format('alter table public.%I enable row level security', t);
        execute format('drop policy if exists "demo_all_select" on public.%I', t);
        execute format('drop policy if exists "demo_all_insert" on public.%I', t);
        execute format('drop policy if exists "demo_all_update" on public.%I', t);
        execute format('drop policy if exists "demo_all_delete" on public.%I', t);
        execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
        execute format('create policy "demo_all_select" on public.%I for select to anon, authenticated using (true)', t);
        execute format('create policy "demo_all_insert" on public.%I for insert to anon, authenticated with check (true)', t);
        execute format('create policy "demo_all_update" on public.%I for update to anon, authenticated using (true) with check (true)', t);
        execute format('create policy "demo_all_delete" on public.%I for delete to anon, authenticated using (true)', t);
      end loop;
    end $$;
  `;

  const result = await applySingleStatement(sql);
  
  if (!result.ok) {
    console.error('❌ REST API SQL execution failed:');
    console.error(result.error);
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Open: https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new');
    console.log('2. Copy all SQL from: supabase/setup_rls.sql');
    console.log('3. Paste and click Run');
    return;
  }

  console.log('✅ RLS policies applied via REST API!');
  console.log('\nRefresh your app at http://localhost:8080/');
}

setupViaRestAPI().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
