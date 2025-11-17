-- ============================================
-- DIAGNOSTIC: Verify RLS Policies on Users Table
-- ============================================
-- Run this script to check if RLS is properly configured
-- ============================================

-- Check 1: Is RLS enabled on users table?
SELECT 
  'RLS Status' as check_name,
  CASE 
    WHEN relrowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED - RUN 010_fix_users_table_rls.sql'
  END as status
FROM pg_class 
WHERE relname = 'users';

-- Check 2: List all policies on users table
SELECT 
  'Policy: ' || policyname as policy_name,
  cmd as operation,
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 'authenticated users'
    WHEN roles::text LIKE '%service_role%' THEN 'service role'
    ELSE roles::text
  END as applies_to,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Has USING clause'
    ELSE '⚠️ No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN '✅ Has WITH CHECK clause'
    ELSE 'No WITH CHECK'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Check 3: Count policies by operation type
SELECT 
  'Policy Count by Operation' as check_name,
  cmd as operation,
  COUNT(*) as policy_count,
  CASE 
    WHEN cmd = 'SELECT' AND COUNT(*) >= 2 THEN '✅ OK'
    WHEN cmd = 'UPDATE' AND COUNT(*) >= 2 THEN '✅ OK'
    WHEN cmd = 'INSERT' AND COUNT(*) >= 1 THEN '✅ OK'
    ELSE '⚠️ May need more policies'
  END as status
FROM pg_policies
WHERE tablename = 'users'
GROUP BY cmd
ORDER BY cmd;

-- Check 4: Verify critical SELECT policy exists
SELECT 
  'Critical SELECT Policy Check' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND cmd = 'SELECT' 
      AND roles::text LIKE '%authenticated%'
      AND qual LIKE '%auth.uid()%'
    ) THEN '✅ Users can view their own profile policy EXISTS'
    ELSE '❌ MISSING - Users cannot fetch their profiles!'
  END as status;

-- Check 5: Test if current user can select from users table
-- (This will only work if you're authenticated)
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Try to count users (should work with service role)
  SELECT COUNT(*) INTO test_count FROM users;
  RAISE NOTICE '✅ Can query users table. Total users: %', test_count;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '❌ INSUFFICIENT PRIVILEGES - RLS policies may be missing';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error querying users table: %', SQLERRM;
END $$;

-- Check 6: Summary
SELECT 
  '=== SUMMARY ===' as summary,
  CASE 
    WHEN (
      SELECT relrowsecurity FROM pg_class WHERE relname = 'users'
    ) AND (
      SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users' AND cmd = 'SELECT'
    ) >= 2 THEN '✅ RLS is properly configured'
    ELSE '❌ RLS needs configuration - Run 010_fix_users_table_rls.sql'
  END as overall_status;
