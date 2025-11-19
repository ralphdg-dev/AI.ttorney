-- ============================================
-- VERIFY: Check if migration was applied correctly
-- ============================================

-- 1. Check if indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'users' 
  AND schemaname = 'public'
ORDER BY indexname;

-- 2. Check RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
  AND schemaname = 'public'
ORDER BY policyname;

-- 3. Test query performance (CRITICAL)
EXPLAIN ANALYZE
SELECT * FROM public.users WHERE id = auth.uid();

-- 4. Check if RLS is enabled
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'users' 
  AND relnamespace = 'public'::regnamespace;

-- 5. Check table statistics
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename = 'users';
