# Supabase RLS Configuration Issue - Solution

## Problem Summary
The Supabase database contains 3 patient records when accessed with the **service_role key**, but the **anon key** (used by the web app) returns 0 rows. This is because Row Level Security (RLS) policies that allow anon access have not been applied.

### Evidence
```
SERVICE_ROLE client: 3 patients found
  - Ravi Kumar
  - Lakshmi Devi  
  - Suresh Nair

ANON client: 0 rows (RLS blocking access)
```

## Root Cause
The migration SQL file (`supabase/migrations/20260606070000_open_rls_and_seed.sql`) contains both:
1. ✅ Data seed statements (already applied - 3 patients exist)
2. ❌ RLS policy setup (NOT applied - policies missing)

The data was seeded, but the RLS policies that allow anon access were never created.

## Solution

### Option 1: Via Supabase Dashboard (Recommended)
1. Open Supabase Dashboard: https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new
2. Copy the entire SQL from: `supabase/setup_rls.sql`
3. Paste into the SQL editor
4. Click **Run** (or Ctrl+Enter)
5. Refresh your app at http://localhost:8080/

Expected output: You'll see a query result with RLS policy status.

### Option 2: Automated (If Supabase adds SQL execution functions)
When Supabase enables `exec_sql()` RPC function, this command will work:
```bash
node scripts/setup_rls_http.js
```

## Verification

After applying RLS policies, run this to confirm:
```bash
node scripts/verify_data.js
```

Expected output:
```
SERVICE_ROLE client: 3 patients found
ANON client: 3 patients found  ← Should now match service_role
```

Then refresh http://localhost:8080/ to see patients in the UI.

## Next Steps
1. Apply the RLS SQL from `supabase/setup_rls.sql` via the Supabase dashboard
2. Run `node scripts/verify_data.js` to confirm anon access works
3. Refresh the app - patients should now display in the queue

## Files Involved
- `supabase/migrations/20260606070000_open_rls_and_seed.sql` - Contains full migration (data + RLS)
- `supabase/setup_rls.sql` - Extracted RLS-only setup (copy-paste to dashboard)
- `scripts/verify_data.js` - Verification script
- `scripts/setup_rls_http.js` - Automated setup (awaiting SQL function availability)
