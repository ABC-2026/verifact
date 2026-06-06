# Verifact Scripts Reference

## For Production Setup (Use These)

### `verify_data.js` - Verify RLS Status
```bash
node scripts/verify_data.js
```
**Purpose**: Check if anon key can read patient data (RLS status)  
**Output**: Shows patient count with service_role vs anon key  
**When to use**: Before and after RLS setup

### `guided_rls_setup.js` - Interactive Setup Guide
```bash
node scripts/guided_rls_setup.js
```
**Purpose**: Opens Supabase dashboard and guides you through SQL setup  
**Output**: Displays SQL to copy, opens browser  
**When to use**: First time RLS setup (INTERACTIVE - wait for browser)

---

## Diagnostic Scripts (For Debugging)

### `supabase_diag.js`
Basic diagnostic - queries all tables with anon key

### `fetch_patients.js`
REST API test - fetches patients using anon key header

### `seed_patients.js`
Early attempt to seed data (superseded by `seed_with_service_role.js`)

### `seed_with_service_role.js`
Checks if data already seeded; skips if found

### `apply_migration.js`
Attempted to apply migration via RPC (failed - function doesn't exist)

### `apply_rls_policies.js`
Attempted RLS via RPC (failed - no exec function)

### `setup_rls_direct.js`
Attempted RLS via JS client RPC (failed - no exec function)

### `setup_rls_http.js`
Attempted RLS via REST HTTP calls (failed - no SQL exec endpoint)

### `setup_rls_rest.js`
Similar to above (failed)

### `setup_rls_postgres.py`
Python stub for direct Postgres connection (not implemented)

### `final_rls_setup.js`
Comprehensive RLS setup attempt - falls back to manual instructions

---

## Setup Workflow

### First Time Setup:
1. Ensure dev server running: `npm run dev`
2. Verify data exists: `node scripts/verify_data.js`
   - Should show 3 patients with service_role
   - Should show 0 patients with anon (this is the problem)
3. Apply RLS:
   - **Option A (RECOMMENDED)**: `node scripts/guided_rls_setup.js`
   - **Option B (Manual)**: Copy SQL from `supabase/setup_rls.sql` to Supabase dashboard
4. Verify again: `node scripts/verify_data.js`
   - Should now show 3 patients with BOTH keys
5. Refresh app: `http://localhost:8080/`
   - Patients should appear in queue

### Troubleshooting:
1. Check RLS status: `node scripts/verify_data.js`
2. Check browser console for: `[supabase]`, `[usePatients]`, `[usePatientIntelligence]`
3. Verify Supabase project URL matches dashboard

---

## SQL Files (Setup Instructions)

### `supabase/setup_rls.sql` (RECOMMENDED)
Secure RLS policy setup - copy entire contents to Supabase SQL editor

### `supabase/disable_rls_temporary.sql` (Demo Only)
Temporary RLS disable for quick demo (⚠️ INSECURE - don't use in production)

---

## Summary

**Essential Scripts**:
- ✅ `verify_data.js` - Always run before and after RLS setup
- ✅ `guided_rls_setup.js` - Interactive setup helper

**SQL Files**:
- ✅ `supabase/setup_rls.sql` - Copy to Supabase dashboard

**Everything else** = diagnostic attempts (for reference/debugging)
