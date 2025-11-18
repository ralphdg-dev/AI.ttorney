# Fix: Auth Timeout Issue After Enabling RLS

## Problem

After enabling Row Level Security (RLS) on the `users` table, you're experiencing "auth timeout: sign in took too long" errors even when already signed in.

## Root Cause

The issue occurs because:

1. **You have a valid session** (already authenticated)
2. **Profile fetch query is slow** - The query to fetch user profile from `users` table times out
3. **Missing database indexes** - The `users` table lacks proper indexes for fast RLS lookups
4. **RLS policy checks are slow** - Without indexes, the `auth.uid() = id` check scans the entire table

## Solution

### Step 1: Apply Database Migration (CRITICAL)

Run the optimization migration to add indexes and optimize RLS policies:

```bash
# Navigate to your Supabase SQL Editor or use psql
cd /Users/ralph/Desktop/AI.ttorney/server/database/migrations

# Apply the migration
psql -h <your-supabase-host> -U postgres -d postgres -f 011_optimize_users_rls_performance.sql
```

**OR** in Supabase Dashboard:

1. Go to **SQL Editor**
2. Open `/server/database/migrations/011_optimize_users_rls_performance.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **Run**

### Step 2: Verify Indexes Were Created

Run this query in Supabase SQL Editor:

```sql
-- Check indexes on users table
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND schemaname = 'public';

-- Should show:
-- idx_users_id
-- idx_users_email
-- idx_users_role
-- idx_users_account_status
```

### Step 3: Verify RLS Policies

```sql
-- Check RLS policies
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'users'
  AND schemaname = 'public';

-- Should show 6 policies:
-- 1. Users can view their own profile (SELECT)
-- 2. Users can update their own profile (UPDATE)
-- 3. Service role can read all users (SELECT)
-- 4. Service role can update all users (UPDATE)
-- 5. Service role can insert users (INSERT)
-- 6. Enable insert for authentication (INSERT)
```

### Step 4: Test Performance

Run this query to test profile fetch speed:

```sql
-- Test query performance (should be < 50ms)
EXPLAIN ANALYZE
SELECT * FROM public.users WHERE id = auth.uid();
```

**Expected result:**

- Execution time: **< 50ms** (should be very fast with index)
- Uses index scan on `idx_users_id`

## What Was Fixed

### Database Side:

1. ✅ **Added indexes** on `id`, `email`, `role`, `account_status`
2. ✅ **Optimized RLS policies** to use indexed columns efficiently
3. ✅ **Analyzed table** for query planner optimization
4. ✅ **Added service role policies** for backend operations

### Client Side:

1. ✅ **Added 8-second timeout** to profile fetch (fails faster)
2. ✅ **Better error messages** for timeout scenarios
3. ✅ **User-friendly toast notifications** for connection issues
4. ✅ **Graceful error handling** instead of hanging

## Expected Results

### Before Fix:

- ❌ Profile fetch takes 15+ seconds
- ❌ "Auth timeout: sign in took too long" error
- ❌ Users can't sign in even with valid credentials
- ❌ RLS policy check scans entire table

### After Fix:

- ✅ Profile fetch completes in **< 50ms**
- ✅ No timeout errors
- ✅ Instant sign-in for authenticated users
- ✅ RLS policy uses index for fast lookup
- ✅ Better error messages if issues occur

## Troubleshooting

### If timeout still occurs:

1. **Check if migration ran successfully:**

   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'users';
   ```

2. **Verify RLS is using indexes:**

   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM public.users WHERE id = auth.uid();
   ```

   Should show "Index Scan using idx_users_id"

3. **Check database connection:**

   - Ensure Supabase project is not paused
   - Check network connectivity
   - Verify no rate limiting

4. **Clear Supabase cache:**
   ```typescript
   // In your app
   await supabase.auth.signOut();
   // Clear AsyncStorage
   // Sign in again
   ```

## Performance Metrics

With proper indexes, you should see:

| Operation         | Before                | After      |
| ----------------- | --------------------- | ---------- |
| Profile fetch     | 15+ seconds (timeout) | < 50ms     |
| RLS policy check  | Full table scan       | Index scan |
| Sign-in time      | 15+ seconds           | < 1 second |
| Auth state change | Hangs                 | Instant    |

## Additional Notes

- **Indexes are critical** for RLS performance with large user tables
- **The `id` column** must be indexed for `auth.uid() = id` checks
- **Client-side timeout** (8s) prevents indefinite hanging
- **Service role policies** allow backend to bypass RLS when needed

## Verification Checklist

- [ ] Migration applied successfully
- [ ] Indexes created on `users` table
- [ ] RLS policies optimized
- [ ] Profile fetch completes in < 50ms
- [ ] No timeout errors on sign-in
- [ ] Client-side changes deployed
- [ ] Users can sign in successfully

## Support

If issues persist after applying this fix:

1. Check Supabase logs for RLS errors
2. Verify indexes are being used (EXPLAIN ANALYZE)
3. Check for network/connection issues
4. Ensure Supabase project is on a paid plan (free tier has limitations)
