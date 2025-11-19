# Fix Profile Fetch Timeout Issue

## Problem

You're experiencing timeout errors when fetching user profiles:

```
❌ Error fetching user profile: {message: 'Profile fetch timeout'}
```

This prevents users from logging in and accessing their profiles.

## Root Cause

The issue is caused by **missing or incorrect Row Level Security (RLS) policies** on the `users` table in Supabase. Without proper RLS policies, the query `supabase.from('users').select('*').eq('id', session.user.id).single()` either:

1. Times out (takes longer than 10 seconds)
2. Returns no data due to permission denial
3. Fails silently

## Solution

### Step 1: Run the RLS Migration SQL

1. **Open Supabase Dashboard**

   - Go to https://supabase.com/dashboard
   - Select your project: `vmlbrckrlgwlobhnpstx`

2. **Navigate to SQL Editor**

   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run the Migration**

   - Open the file: `/server/database/migrations/010_fix_users_table_rls.sql`
   - Copy the entire SQL script
   - Paste it into the SQL Editor
   - Click "Run" or press `Cmd+Enter`

4. **Verify Success**
   - You should see: `RLS policies successfully configured for users table`
   - If you see any errors, read them carefully and fix accordingly

### Step 2: Verify RLS Policies

After running the migration, verify the policies are in place:

```sql
-- Check if RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'users';
-- Should return: relrowsecurity = true

-- List all policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users';
-- Should show 5 policies:
-- 1. Users can view their own profile (SELECT)
-- 2. Users can update their own profile (UPDATE)
-- 3. Service role can read all users (SELECT)
-- 4. Service role can update all users (UPDATE)
-- 5. Enable insert for authentication (INSERT)
```

### Step 3: Test the Fix

1. **Clear browser cache and storage**

   ```javascript
   // In browser console:
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Reload the application**

   - Press `Cmd+Shift+R` (hard reload)

3. **Try logging in**
   - The profile should now load without timeout
   - Check console for success messages:
     ```
     ✅ Profile fetch completed or timed out
     🔐 User profile fetched: {role: 'registered_user', account_status: 'active'}
     ```

## What the RLS Policies Do

### Policy 1: Users can view their own profile

```sql
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT TO authenticated
USING (auth.uid() = id);
```

**Critical**: This allows authenticated users to SELECT their own row from the users table. Without this, the profile fetch will timeout or fail.

### Policy 2: Users can update their own profile

```sql
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

Allows users to update their own profile information.

### Policy 3 & 4: Service role access

```sql
CREATE POLICY "Service role can read all users"
ON public.users FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role can update all users"
ON public.users FOR UPDATE TO service_role USING (true) WITH CHECK (true);
```

Allows backend services (using service role key) to read and update all user data.

### Policy 5: Enable insert for authentication

```sql
CREATE POLICY "Enable insert for authentication"
ON public.users FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);
```

Allows new users to be inserted during registration.

## Enhanced Error Logging

The client code has been updated to provide better diagnostics:

1. **Extended timeout**: Increased from 7s to 10s
2. **Detailed error logging**: Shows error code, message, and details
3. **Specific error detection**: Identifies timeout, permission, and missing row errors
4. **Actionable guidance**: Provides specific steps to fix each error type

## Common Error Messages

### "Profile fetch timeout after 10 seconds"

- **Cause**: Query is taking too long
- **Fix**: Run the RLS migration SQL
- **Check**: Verify RLS policies exist in Supabase dashboard

### "PGRST116: No rows returned"

- **Cause**: User row doesn't exist in database
- **Fix**: Check if user was properly created during registration
- **Verify**: Run `SELECT * FROM users WHERE id = 'user-id'` in SQL Editor

### "Permission denied" or "insufficient privileges"

- **Cause**: Missing RLS policy for SELECT
- **Fix**: Run the RLS migration SQL
- **Verify**: Check policies with query in Step 2

## Prevention

To prevent this issue in the future:

1. **Always enable RLS** on tables containing user data
2. **Create policies immediately** after creating tables
3. **Test authentication flow** after any database schema changes
4. **Monitor Supabase logs** for permission errors
5. **Use service role** for backend operations that need full access

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

## Need Help?

If the issue persists after running the migration:

1. Check Supabase dashboard logs for errors
2. Verify your Supabase URL and anon key are correct
3. Test the query directly in SQL Editor:
   ```sql
   SELECT * FROM users WHERE id = 'your-user-id';
   ```
4. Check network connectivity to Supabase
5. Verify your Supabase project is not paused or suspended
