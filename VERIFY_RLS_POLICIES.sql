-- ============================================
-- VERIFY: Check if RLS policies were applied
-- ============================================

-- 1. Check if RLS is enabled
SELECT 
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('lawyer_info', 'lawyer_applications');

-- 2. List all policies
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
WHERE tablename IN ('lawyer_info', 'lawyer_applications')
ORDER BY tablename, policyname;

-- 3. Test query as authenticated user (simulate what the app does)
-- This should work if policies are correct
SELECT * FROM public.lawyer_info 
WHERE lawyer_id = auth.uid()
LIMIT 1;

-- 4. Check if the tables exist and have data
SELECT 
  'lawyer_info' as table_name,
  COUNT(*) as row_count
FROM public.lawyer_info
UNION ALL
SELECT 
  'lawyer_applications' as table_name,
  COUNT(*) as row_count
FROM public.lawyer_applications;
