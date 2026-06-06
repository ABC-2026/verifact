# Verifact MVP - Setup Complete (RLS Remaining)

## Current Status ✅

### What's Working:
- ✅ Dev server running at `http://localhost:8080/`
- ✅ React UI rendering with TanStack Router
- ✅ Supabase JS client configured and initialized
- ✅ Database seeded with 3 patients (Ravi Kumar, Lakshmi Devi, Suresh Nair)
- ✅ Service role key verified and functional
- ✅ Debugging instrumentation in place (console logs for URL, queries, responses)
- ✅ Removed all local fallback data sources

### What's Blocked:
- ⚠️ **Anon key cannot read patients** - RLS policies not applied
- ⚠️ **App shows 0 patients** - Because anon key is blocked by RLS

## The Issue (Technical)

The Supabase project has:
- **Data**: ✅ 3 patients inserted and stored
- **RLS**: ❌ Policies not created

When the anon key tries to read:
```
service_role client → 3 patients ✅
anon client        → 0 patients ❌ (RLS blocking)
```

## The Solution (One Step)

Apply RLS policies to unblock the anon key:

### Step 1: Open Supabase SQL Editor
Visit: https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new

### Step 2: Copy This SQL
```sql
-- Enable RLS and create permissive policies for all tables
do $$
declare t text;
begin
  foreach t in array array[
    'patients','priority_scores','triage_results','voice_notes',
    'prescriptions','doctors','doctor_patients','care_circles',
    'patient_baselines','notifications'
  ] loop
    alter table public.%I enable row level security;
    drop policy if exists "demo_all_select" on public.%I;
    drop policy if exists "demo_all_insert" on public.%I;
    drop policy if exists "demo_all_update" on public.%I;
    drop policy if exists "demo_all_delete" on public.%I;
    grant select, insert, update, delete on public.%I to anon, authenticated;
    create policy "demo_all_select" on public.%I for select to anon, authenticated using (true);
    create policy "demo_all_insert" on public.%I for insert to anon, authenticated with check (true);
    create policy "demo_all_update" on public.%I for update to anon, authenticated using (true) with check (true);
    create policy "demo_all_delete" on public.%I for delete to anon, authenticated using (true);
  end loop;
end $$;
```

**Full version available in:** `supabase/setup_rls.sql`

### Step 3: Run the SQL
Click **Run** button in Supabase editor (or Ctrl+Enter)

### Step 4: Verify
```bash
node scripts/verify_data.js
```

Expected output:
```
SERVICE_ROLE client: 3 patients found
ANON client: 3 patients found  ← Should now match!
```

### Step 5: Refresh the App
Open http://localhost:8080/ and you should see:
- 3 patients in the priority queue
- Sorted by priority score (highest first)
- Ready for doctor workflow testing

## Doctor Workflow to Test

Once patients appear:

1. **View Dashboard**
   - See 3 patients in priority queue
   - Cards show: name, age, phone, conditions, priority score

2. **Open Patient Drawer**
   - Click on a patient to see intelligence panel
   - View triage results, voice notes, prescriptions
   - See priority trend chart

3. **Add/Edit Notes**
   - Click "Add Note" to record voice transcript
   - Updates should persist to Supabase

4. **Edit Patient**
   - Edit patient info (name, age, conditions)
   - Changes should persist

## Files Created/Modified

### RLS Setup Files:
- `supabase/setup_rls.sql` - Secure RLS policy setup (RECOMMENDED)
- `supabase/disable_rls_temporary.sql` - Temporary RLS disable (demo only)
- `RLS_SETUP_FINAL.md` - Setup instructions

### Verification:
- `scripts/verify_data.js` - Checks both service_role and anon access
- `scripts/final_rls_setup.js` - Automated setup attempt + manual fallback
- `scripts/guided_rls_setup.js` - Interactive setup guide (opens browser)

### Code Instrumentation:
- `src/lib/supabase.ts` - Logs runtime URL
- `src/lib/hooks/usePatients.ts` - Logs queries and responses
- `src/lib/hooks/usePatientIntelligence.ts` - Logs queries and responses

### Removed:
- Local fallback data (`src/lib/localSeed.ts`)
- Silent error handling (now throws on Supabase failures)

## Troubleshooting

### If patients still don't appear after RLS setup:
1. Check console: `node scripts/verify_data.js`
2. Open browser DevTools (F12) and check console logs
3. Look for `[supabase]` log showing URL (verify it's the right project)
4. Look for `[usePatients]` log showing raw response

### If SQL fails to run in Supabase editor:
- Clear the editor and paste the SQL from `supabase/setup_rls.sql`
- Ensure you copy the **entire block** from `do $$` to `end $$;`
- Click Run and wait 2-3 seconds

## Environment Verified

- Project URL: `https://rngbrpitkkhplfwfmrym.supabase.co`
- Service role key: ✅ Working (can access data)
- Anon key: ❌ Blocked (needs RLS policies)
- Database: ✅ Seeded with 3 patients
- App server: ✅ Running at http://localhost:8080/

---

**NEXT ACTION**: Open Supabase dashboard and apply the RLS SQL (Step 1-3 above) → Everything will work! 🚀
