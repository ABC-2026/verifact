# Verifact MVP - Doctor Dashboard Setup Guide

> **Current Status**: ✅ App running, ⚠️ RLS policies needed to display patients

## Quick Start (2 Steps)

### Step 1: Open Supabase SQL Editor
https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new

### Step 2: Copy & Run This SQL
Copy the entire contents of [`supabase/setup_rls.sql`](supabase/setup_rls.sql) into the editor, then click **Run**.

### Step 3: Refresh App
Open http://localhost:8080/ - you should now see 3 patients in the queue! 🎉

---

## What's Done

✅ **Codebase cleaned**
- Removed all local mock data
- Removed hardcoded Supabase credentials (using environment-friendly exports)
- Removed error suppression (now throws on Supabase failures)

✅ **Dependencies installed**
- `npm install --legacy-peer-deps` (resolved peer dependency conflict)

✅ **Dev server running**
- `npm run dev` at http://localhost:8080/
- Hot module reloading active
- React + TanStack Router + Tailwind UI

✅ **Supabase configured**
- Project URL: `https://rngbrpitkkhplfwfmrym.supabase.co`
- Anon key exported and available
- Service role key verified

✅ **Database seeded**
- 3 patient records inserted
- Priority scores populated
- Triage results created

✅ **Debugging instrumented**
- Runtime logs for Supabase URL
- Console logs for exact queries and responses
- No silent failures

---

## What's Left (One Step)

⚠️ **RLS Policies Need To Be Applied**

Currently:
- Service role key ✅ can read 3 patients
- Anon key (used by app) ❌ cannot read (RLS blocking)
- App shows 0 patients (waits for data)

**Solution**: Apply the SQL from Step 2 above → Anon key unblocked → App works!

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Browser (React App)                    │
│  - TanStack Router                      │
│  - Tailwind UI Components               │
│  - Custom Hooks (usePatients, etc)      │
└─────────────────┬───────────────────────┘
                  │ (uses anon key)
                  ↓
┌─────────────────────────────────────────┐
│  Supabase JS Client                     │
│  - Project: rngbrpitkkhplfwfmrym        │
│  - URL: https://...supabase.co          │
└─────────────────┬───────────────────────┘
                  │ (needs RLS policies)
                  ↓
┌─────────────────────────────────────────┐
│  PostgreSQL + RLS                       │
│  - Tables: patients, priority_scores... │
│  - RLS policies: [NEED TO APPLY]        │
│  - Data: [✅ 3 patients seeded]         │
└─────────────────────────────────────────┘
```

---

## Files & Structure

### Key Application Files
- `src/lib/supabase.ts` - Supabase client initialization
- `src/lib/hooks/usePatients.ts` - Load patient queue, sorted by priority
- `src/lib/hooks/usePatientIntelligence.ts` - Load triage results & notes per patient
- `src/routes/index.tsx` - Main dashboard route
- `src/components/verifact/` - UI components

### Setup & Configuration
- `supabase/setup_rls.sql` - ✅ **Copy this to Supabase dashboard**
- `supabase/disable_rls_temporary.sql` - Temporary RLS disable (demo only)
- `package.json` - Dependencies (Supabase, React, TailwindUI, etc)
- `vite.config.ts` - Build configuration

### Verification & Diagnostics
- `scripts/verify_data.js` - Check RLS status (run before & after)
- `scripts/guided_rls_setup.js` - Interactive setup helper
- `scripts/supabase_diag.js` - Basic diagnostic queries
- `SCRIPTS_REFERENCE.md` - Script documentation

### Documentation
- **READ THESE FIRST:**
  - `MVP_SETUP_STATUS.md` - Current status & next steps
  - `RLS_SETUP_FINAL.md` - RLS setup instructions with options
  - `SCRIPTS_REFERENCE.md` - Script reference guide

---

## Testing the Doctor Workflow

Once RLS is applied and patients appear:

### Dashboard
1. View patient queue (3 patients, sorted by priority score DESC)
2. See metrics: Active patients, High priority, Pending actions

### Patient Drawer
1. Click a patient to open intelligence panel
2. View:
   - Triage results (severity, summary, reasoning)
   - Voice notes (transcripts)
   - Care actions (prescriptions)

### Patient Form
1. Edit patient: name, age, phone, conditions
2. Changes persist to Supabase

### Add Notes
1. Click "Add Note" to record a note
2. Persists to voice_notes table

---

## Troubleshooting

### "I get 0 patients even after applying RLS"
1. Run: `node scripts/verify_data.js`
2. Check the output - it should show:
   ```
   SERVICE_ROLE: 3 patients
   ANON:         3 patients  ← Must match!
   ```
3. If still 0, check:
   - Supabase SQL editor ran without errors
   - You copied the **entire SQL block** (from `do $$` to `end $$;`)
   - Browser cache cleared (F5 or Ctrl+Shift+R)

### "SQL fails to run in Supabase"
1. Clear the SQL editor
2. Copy fresh from `supabase/setup_rls.sql`
3. Ensure you copy from `do $$` to the last `$$;`
4. Click Run and wait 2-3 seconds

### "App shows error in console"
1. Open DevTools (F12)
2. Look for logs starting with `[supabase]` or `[usePatients]`
3. Note the exact error message
4. Check if Supabase URL in logs matches your project

---

## Environment Details

**Supabase Project**
- Name: verifact-pulse
- Region: AWS (likely us-east-1)
- URL: https://rngbrpitkkhplfwfmrym.supabase.co
- Auth: Anon key + Service role key

**Application**
- Server: Vite dev server at http://localhost:8080/
- Framework: React 19 + TypeScript
- Styling: Tailwind CSS + Shadcn UI components
- Routing: TanStack Router (file-based)

**Database**
- Type: PostgreSQL (Supabase)
- Status: Seeded (3 patients)
- Tables: patients, priority_scores, triage_results, voice_notes, prescriptions, doctors

---

## Next Steps After Setup

1. ✅ Apply RLS SQL (Step 2 above)
2. ✅ Verify: `node scripts/verify_data.js`
3. ✅ Refresh browser: http://localhost:8080/
4. 🧪 Test doctor workflow:
   - View patient queue
   - Click patient to see intelligence
   - Add notes, edit patient
5. 📋 Document any issues or missing features

---

## Support Files

If you need to re-seed or diagnose:
```bash
# Check RLS status
node scripts/verify_data.js

# Interactive setup
node scripts/guided_rls_setup.js

# Basic diagnostic
node scripts/supabase_diag.js
```

For manual SQL setup:
- Main: `supabase/setup_rls.sql`
- Fallback: `supabase/disable_rls_temporary.sql` (demo only)

---

**Status**: Ready for RLS setup → Full functionality 🚀
