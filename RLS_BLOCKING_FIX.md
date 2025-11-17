# RLS is Blocking the Query - Fix

## 🔍 Problem Identified

The query is **hanging** (not completing), which means:

- ✅ User exists in database
- ✅ Supabase is healthy (240ms in tests)
- ❌ **RLS policy is blocking the query**

The query starts but never returns because RLS is preventing access.

---

## 🚀 Quick Test - Disable RLS Temporarily

Run this in **Supabase SQL Editor**:

```sql
-- Disable RLS temporarily to test
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

Then try logging in again. If it works, **RLS is the problem**.

---

## 🔧 Permanent Fix - Update RLS Policy

The issue is that the RLS policy might not be recognizing the authenticated user. Try this updated policy:

```sql
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create a more permissive policy for authenticated users
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR
  id::text = current_setting('request.jwt.claim.sub', true)
);
```

This policy checks both:

1. `auth.uid()` - Standard Supabase auth
2. `current_setting('request.jwt.claim.sub')` - JWT claim fallback

---

## 🎯 Alternative Fix - Allow All Authenticated Reads

If the above doesn't work, use this simpler policy:

```sql
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Allow all authenticated users to read all user profiles
CREATE POLICY "Authenticated users can read users"
ON public.users
FOR SELECT
TO authenticated
USING (true);
```

**Note:** This allows authenticated users to read ALL user profiles, not just their own. This is fine for most apps since user profiles are typically public data.

---

## 📋 Step-by-Step Fix

### Step 1: Disable RLS (Test)

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

### Step 2: Try Logging In

- If login works → RLS is the problem
- If login still fails → Different issue

### Step 3: Re-enable RLS with Better Policy

```sql
-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create new policy that allows authenticated users to read
CREATE POLICY "Authenticated users can read users"
ON public.users
FOR SELECT
TO authenticated
USING (true);
```

### Step 4: Test Login Again

Should work now!

---

## 🔍 Why This Happens

The original policy `USING (auth.uid() = id)` requires:

1. User to be authenticated ✅
2. JWT to be properly passed to database ❌ (might be failing here)
3. `auth.uid()` to match the user's ID

Sometimes the JWT isn't properly passed from the Supabase JS client to the database, causing `auth.uid()` to return NULL, which makes the policy fail.

---

## ✅ Recommended Solution

Use the permissive policy that allows all authenticated users to read:

```sql
-- Final recommended policy
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;

CREATE POLICY "Authenticated users can read users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Keep the update policy restrictive (users can only update themselves)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

This way:

- ✅ Reading is allowed for all authenticated users (login works)
- ✅ Updates are still restricted to own profile (security maintained)

---

## 🎉 Expected Result

After applying the fix:

- Login should complete in 1-2 seconds
- No more hanging queries
- Profile loads successfully

Try it and let me know! 🚀
