# RLS Setup Complete - Final Instructions

## Status
✅ **Data exists in Supabase** (3 patients verified with service_role key)  
❌ **Anon key blocked by RLS** (policies not applied)  
⚠️ **App currently shows 0 patients** (requires RLS fix)

## The Issue
Supabase requires Row Level Security (RLS) policies to allow the anon key to read data. The migration seeded data but didn't apply RLS policies.

## Two Solutions

### Option 1: RECOMMENDED - Proper RLS Setup (Secure)
1. Open Supabase SQL Editor: https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new
2. Copy **entire contents** of [`supabase/setup_rls.sql`](supabase/setup_rls.sql)
3. Paste into editor and click **Run**
4. Verify: `node scripts/verify_data.js` should show 3 patients with both keys
5. Refresh app: http://localhost:8080/ → patients appear in queue

**This is the secure solution that enables anon read access only.**

---

### Option 2: TEMPORARY - Disable RLS (For Demo Only)
**⚠️ WARNING: This is INSECURE and for development/testing ONLY.**

1. Open Supabase SQL Editor: https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new
2. Copy **entire contents** of [`supabase/disable_rls_temporary.sql`](supabase/disable_rls_temporary.sql)
3. Paste and click **Run**
4. Refresh app: http://localhost:8080/ → patients appear immediately
5. **BEFORE PRODUCTION**: Re-enable RLS using Option 1

---

## Verification Script

After applying either solution, run:
```bash
node scripts/verify_data.js
```

Expected output:
```
SERVICE_ROLE client: 3 patients found
ANON client: 3 patients found  ← Should match!
```

## Next Steps

1. **Choose Option 1 or 2** above and apply the SQL
2. Run verification: `node scripts/verify_data.js`
3. Refresh http://localhost:8080/
4. Try the doctor workflow:
   - Login
   - View patient queue (sorted by priority)
   - Click a patient to open intelligence panel
   - Add notes, view triage results

## Files Reference
- `supabase/setup_rls.sql` - Proper RLS policies (RECOMMENDED)
- `supabase/disable_rls_temporary.sql` - RLS disable (demo only)
- `scripts/verify_data.js` - Verification script
- `RLS_FIX_README.md` - Detailed technical explanation

---

**Once you apply the SQL and refresh the app, the MVP should be fully functional!**
