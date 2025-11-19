# Fix 406 Errors - Final Solution

## Problem

Still getting 406 errors after applying the first migration:

```
GET /lawyer_info?lawyer_id=eq.[id] → 406 Not Acceptable
GET /lawyer_applications?user_id=eq.[id] → 406 Not Acceptable
```

## Root Cause

The first migration might have created **conflicting policies** or the policies aren't working with the `.single()` query method.

## Solution

### Step 1: Apply the Simplified Migration

Run `FIX_LAWYER_INFO_RLS_V2.sql` in Supabase SQL Editor.

**This migration:**

1. ✅ Drops ALL existing policies (cleans up conflicts)
2. ✅ Creates ONE simple policy per operation (SELECT, INSERT, UPDATE, DELETE)
3. ✅ Uses `USING (true)` for SELECT on `lawyer_info` (allows everyone to read)
4. ✅ Uses `user_id = auth.uid()` for `lawyer_applications` (only own data)

### Step 2: Verify Policies Were Created

After running the migration, check the output. You should see:

**For `lawyer_info`:**

- Allow all to read lawyer info (SELECT)
- Allow lawyers to insert their own info (INSERT)
- Allow lawyers to update their own info (UPDATE)
- Allow lawyers to delete their own info (DELETE)

**For `lawyer_applications`:**

- Allow users to read their own application (SELECT)
- Allow users to insert their own application (INSERT)
- Allow users to update their own application (UPDATE)
- Allow users to delete their own application (DELETE)

### Step 3: Clear Browser Cache

**CRITICAL:** The browser might be caching the 406 responses.

```javascript
// In browser console (F12):
localStorage.clear();
sessionStorage.clear();

// Then hard refresh:
// Mac: Cmd + Shift + R
// Windows: Ctrl + Shift + R
```

### Step 4: Test

1. Sign in as lawyer
2. Go to profile page
3. Check console - should see:
   ```
   ✅ No 406 errors
   ✅ Profile data loads
   ```

## Why This Version Works Better

### Problem with First Migration:

```sql
-- Policy 1: Lawyers can view their own
USING (lawyer_id = auth.uid())

-- Policy 2: Public can view all
USING (true)
```

**Issue:** Two SELECT policies might conflict or confuse Postgres

### Solution in V2:

```sql
-- ONE policy for SELECT
USING (true)  -- Simple, allows everyone
```

**Better:** Single, clear policy per operation

## If Still Getting 406

### Check 1: Verify RLS is Enabled

```sql
SELECT
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('lawyer_info', 'lawyer_applications');
```

**Expected:** Both should show `rls_enabled = true`

### Check 2: Verify Policies Exist

```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('lawyer_info', 'lawyer_applications')
GROUP BY tablename;
```

**Expected:**

- `lawyer_info`: 4 policies
- `lawyer_applications`: 4 policies

### Check 3: Test Direct Query

```sql
-- This should work if policies are correct
SELECT * FROM public.lawyer_info LIMIT 1;
SELECT * FROM public.lawyer_applications LIMIT 1;
```

**Expected:** Returns data (or empty if no data exists)

### Check 4: Verify Auth Token

In browser console:

```javascript
// Check if you're authenticated
const {
  data: { session },
} = await supabase.auth.getSession();
console.log("Session:", session);
console.log("User ID:", session?.user?.id);
```

**Expected:** Should show valid session and user ID

## Alternative: Disable RLS Temporarily (Testing Only)

**WARNING:** Only for testing, NOT for production!

```sql
-- Temporarily disable RLS to test if that's the issue
ALTER TABLE public.lawyer_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_applications DISABLE ROW LEVEL SECURITY;

-- Test if 406 errors go away
-- If they do, the problem is definitely RLS policies

-- Re-enable RLS after testing
ALTER TABLE public.lawyer_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_applications ENABLE ROW LEVEL SECURITY;
```

## Expected Results

### After Applying V2 Migration:

- ✅ 406 errors disappear
- ✅ Lawyer profile loads
- ✅ Forum page stays stable (no more redirects)
- ✅ Lawyer directory works
- ✅ Consultation requests work

### If Still Not Working:

Share the output of:

1. The verification queries (Check 1, 2, 3 above)
2. Browser console errors
3. Network tab showing the 406 request details

This will help identify if it's:

- RLS policy issue
- Auth token issue
- Supabase configuration issue
- Client-side caching issue
