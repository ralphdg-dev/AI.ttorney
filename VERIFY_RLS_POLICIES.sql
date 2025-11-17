-- Run this in Supabase SQL Editor to verify RLS policies are actually working

-- Step 1: Check if RLS is enabled
SELECT 
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  n.nspname as schema_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'users' 
AND n.nspname = 'public';
-- Expected: rls_enabled = true

-- Step 2: List all policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
AND schemaname = 'public'
ORDER BY policyname;
-- Expected: Should see 5 policies

-- Step 3: Test the actual query that's failing
-- This simulates what your app is doing
SET ROLE authenticated;
SET request.jwt.claim.sub = 'ef887550-7777-4501-be9c-7c43e583fd2e';

SELECT * 
FROM public.users 
WHERE id = 'ef887550-7777-4501-be9c-7c43e583fd2e';

-- If this hangs or returns no rows, the RLS policy is blocking it

-- Step 4: Reset role
RESET ROLE;

-- Step 5: Try as service_role (should always work)
SELECT * 
FROM public.users 
WHERE id = 'ef887550-7777-4501-be9c-7c43e583fd2e';
-- This should return the user row
