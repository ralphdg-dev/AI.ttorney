# Troubleshooting Auth Timeout - Step by Step

## What I Just Changed

1. ✅ **Increased timeout** from 8s to 20s
2. ✅ **Added detailed logging** to see exactly what's happening
3. ✅ **Added timing metrics** to measure fetch speed

## Next Steps - Do These IN ORDER

### Step 1: Check Browser Console (CRITICAL)

1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Try to sign in
5. **Look for these logs:**

```
🔍 Fetching profile for user: [user-id]
✅ Profile fetch completed in XXXms
```

**Share the exact output** - especially:

- How many milliseconds (ms) it took
- Any error messages

---

### Step 2: Verify Migration in Supabase

Go to Supabase SQL Editor and run:

```sql
-- Quick verification
SELECT
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE 'idx_users_%') as indexes_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users') as policies_created,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'users') as rls_enabled;
```

**Expected result:**

- `indexes_created`: 4 or more
- `policies_created`: 6 or more
- `rls_enabled`: true

**If indexes_created is 0**, the migration didn't run. Re-run it.

---

### Step 3: Test Database Speed Directly

In Supabase SQL Editor:

```sql
-- Test 1: Simple query
EXPLAIN ANALYZE
SELECT * FROM public.users LIMIT 1;

-- Test 2: Auth query (requires you to be signed in to dashboard)
EXPLAIN ANALYZE
SELECT * FROM public.users WHERE id = auth.uid();
```

**Share the "Execution Time" from both queries.**

Should be:

- Test 1: < 50ms
- Test 2: < 100ms

If either is > 1000ms, there's a database issue.

---

### Step 4: Check Supabase Project Status

1. Go to Supabase Dashboard
2. Check project status (top right)
3. **Is it paused?** Unpause it
4. **Free tier?** Might have rate limits
5. **Which region?** Far regions = higher latency

---

### Step 5: Clear Everything and Test Fresh

```bash
# In browser console:
localStorage.clear()
sessionStorage.clear()

# Then:
1. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
2. Sign in again
3. Check console logs
```

---

## Diagnostic Checklist

Run through this checklist and tell me which ones FAIL:

- [ ] Migration SQL ran without errors
- [ ] Indexes exist (verified in Step 2)
- [ ] RLS policies exist (verified in Step 2)
- [ ] Database queries are fast (< 100ms in Step 3)
- [ ] Supabase project is active (not paused)
- [ ] Browser console shows fetch logs
- [ ] Fetch completes in < 5000ms (5 seconds)
- [ ] No RLS errors in console
- [ ] No network errors in console

---

## Common Failure Scenarios

### Scenario A: "Indexes created: 0"

**Problem:** Migration didn't run
**Fix:** Copy the SQL from `011_optimize_users_rls_performance.sql` and run it again

### Scenario B: "Execution Time: 5000ms+"

**Problem:** Database is slow even with indexes
**Possible causes:**

- Supabase project paused
- Free tier limitations
- Network issues
- Need to restart Supabase project

### Scenario C: "Profile fetch completed in 100ms" but still redirects

**Problem:** Not a database issue, something else is wrong
**Check:** Other error messages in console

### Scenario D: "RLS policy violation" error

**Problem:** Policy not configured correctly
**Fix:** Check if you're using service role key instead of anon key

---

## What to Share With Me

Please run Steps 1-3 above and share:

1. **Browser console output** (the 🔍 and ✅ logs)
2. **Step 2 SQL results** (indexes_created, policies_created, rls_enabled)
3. **Step 3 execution times** (both Test 1 and Test 2)

With this info, I can pinpoint the exact issue.
