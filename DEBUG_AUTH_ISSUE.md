# Debug Auth Timeout Issue

## Step 1: Verify Migration Applied

Run this in Supabase SQL Editor:

```sql
-- Check indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'users' AND schemaname = 'public';
```

**Expected output:**

- `idx_users_id`
- `idx_users_email`
- `idx_users_role`
- `idx_users_account_status`
- Plus any existing indexes (users_pkey, etc.)

**If you DON'T see these indexes**, the migration didn't run properly.

---

## Step 2: Test Query Performance

Run this in Supabase SQL Editor:

```sql
EXPLAIN ANALYZE
SELECT * FROM public.users LIMIT 1;
```

**What to look for:**

- Execution time should be **< 100ms**
- If it's > 1000ms, there's a database performance issue

---

## Step 3: Check RLS Policy

Run this:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users';
```

**Expected:**

- Should show "Users can view their own profile" policy
- `qual` should be something like `(id = auth.uid())`

---

## Step 4: Test Actual Auth Query

This is the REAL test - run the exact query your app uses:

```sql
-- First, sign in to Supabase dashboard so you have auth.uid()
SELECT auth.uid(); -- Should return your user ID

-- Then test the profile fetch
SELECT * FROM public.users WHERE id = auth.uid();
```

**Time this query:**

- Should complete in **< 100ms**
- If it times out or takes > 5 seconds, RLS is still slow

---

## Common Issues After Migration

### Issue 1: Migration didn't actually run

**Symptoms:** No indexes created
**Fix:** Re-run the migration SQL

### Issue 2: Supabase connection pooler issue

**Symptoms:** Queries are slow even with indexes
**Fix:** Check Supabase project status, might be on free tier with limitations

### Issue 3: Client-side timeout too aggressive

**Symptoms:** Database is fast but client still times out
**Fix:** Increase timeout from 8s to 15s

### Issue 4: Network latency

**Symptoms:** Query is fast in SQL Editor but slow in app
**Fix:** Check network connection, Supabase region

### Issue 5: Auth token invalid

**Symptoms:** RLS can't verify auth.uid()
**Fix:** Clear all auth storage and sign in fresh

---

## Quick Diagnostic

Run ALL of these in Supabase SQL Editor and share results:

```sql
-- 1. Check indexes
SELECT COUNT(*) as index_count FROM pg_indexes
WHERE tablename = 'users' AND indexname LIKE 'idx_users_%';

-- 2. Check RLS enabled
SELECT relrowsecurity FROM pg_class WHERE relname = 'users';

-- 3. Check policy count
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'users';

-- 4. Test simple query speed
EXPLAIN ANALYZE SELECT * FROM public.users LIMIT 1;

-- 5. Check your auth
SELECT auth.uid() as my_user_id;
```

**Share the output of these queries so I can diagnose the exact issue.**
