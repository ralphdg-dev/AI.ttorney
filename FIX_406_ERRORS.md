# Fix: 406 Not Acceptable Errors

## Problem

Getting 406 errors when accessing:

- `lawyer_info` table
- `lawyer_applications` table

```
GET /rest/v1/lawyer_info?select=...&lawyer_id=eq.[id] 406 (Not Acceptable)
GET /rest/v1/lawyer_applications?select=...&user_id=eq.[id] 406 (Not Acceptable)
```

## Root Cause

**406 Not Acceptable** from Supabase means:

1. **RLS policies are blocking the request**, OR
2. **No RLS policies exist** for these tables

The client is using the **anon key** (not service role), so RLS policies must allow access.

## Solution

Apply the SQL migration to add proper RLS policies for both tables.

### What the Migration Does:

1. **Enables RLS** on both tables
2. **Adds policies** for:
   - Lawyers viewing their own info
   - Lawyers updating their own info
   - Public viewing lawyer info (for directory)
   - Service role managing everything
3. **Adds indexes** for performance
4. **Analyzes tables** for query optimization

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your AI.ttorney project
3. Click **SQL Editor** in left sidebar
4. Click **New query**
5. Copy the contents of `FIX_LAWYER_INFO_RLS.sql`
6. Paste into the editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

### Option 2: Command Line

```bash
psql "postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres" \
  -f server/database/migrations/FIX_LAWYER_INFO_RLS.sql
```

## Expected Results

### Before Fix:

```
❌ GET /lawyer_info → 406 Not Acceptable
❌ GET /lawyer_applications → 406 Not Acceptable
❌ Lawyer profile page fails to load
❌ Lawyer directory doesn't work
```

### After Fix:

```
✅ GET /lawyer_info → 200 OK
✅ GET /lawyer_applications → 200 OK
✅ Lawyer profile page loads correctly
✅ Lawyer directory works
```

## Verification

After applying the migration, run this in SQL Editor:

```sql
-- Check policies were created
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('lawyer_info', 'lawyer_applications')
ORDER BY tablename, policyname;
```

**Expected output:**

- At least 3-4 policies for `lawyer_info`
- At least 4 policies for `lawyer_applications`

## Test the Fix

1. **Clear browser cache:**

   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Hard refresh** (Cmd+Shift+R)

3. **Sign in as lawyer**

4. **Go to profile page**

5. **Check console** - should see:
   ```
   ✅ No more 406 errors
   ✅ Profile data loads successfully
   ```

## Why This Happened

The `lawyer_info` and `lawyer_applications` tables likely:

1. Had RLS enabled but no policies
2. Had policies that didn't match the query pattern
3. Were missing policies for the `anon` role

## Related Issues

This might also fix:

- ❌ Lawyer profile not loading
- ❌ Lawyer directory showing empty
- ❌ Consultation requests failing
- ❌ Lawyer application status not showing

All of these depend on accessing `lawyer_info` and `lawyer_applications` tables.

## Status

⏳ **Waiting for migration to be applied**

Once applied:

- ✅ 406 errors should disappear
- ✅ Lawyer profile should load
- ✅ Forum refresh issue should be resolved (if it was caused by profile fetch failing)
