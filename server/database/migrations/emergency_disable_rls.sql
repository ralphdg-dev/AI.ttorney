-- ============================================================================
-- EMERGENCY: DISABLE RLS TEMPORARILY
-- ============================================================================
-- ⚠️ WARNING: This removes security protections!
-- Only use this to get your app working while you fix the policies properly
-- ============================================================================

-- Disable RLS on tables that are breaking the app
ALTER TABLE consultation_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on these (they're working fine)
-- ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE glossary_terms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE legal_articles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NEXT STEPS:
-- ============================================================================
-- 1. Run this to get your app working NOW
-- 2. Test your app functionality
-- 3. Then run fix_rls_policies.sql to properly secure the tables
-- 4. Test again to ensure policies work correctly
-- 5. Re-enable RLS on these tables one by one
-- ============================================================================

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'consultation_requests', 
    'lawyer_info', 
    'users', 
    'notifications',
    'chat_sessions',
    'chat_messages'
  )
ORDER BY tablename;
