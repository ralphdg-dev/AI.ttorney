-- ============================================================================
-- MINIMAL RLS - Only What You Actually Need
-- ============================================================================
-- Enable RLS only on tables that:
-- 1. Frontend queries directly (not backend-only)
-- 2. Need user-specific data filtering
-- ============================================================================

BEGIN;

-- ============================================================================
-- DISABLE RLS on backend-only tables
-- ============================================================================

ALTER TABLE admin DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE reported_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_violations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ENABLE RLS on user-facing tables (frontend queries these)
-- ============================================================================

ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_forum_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_glossary_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_guide_bookmarks ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'admin',
    'consultation_requests',
    'users',
    'lawyer_info',
    'notifications',
    'chat_sessions',
    'chat_messages',
    'forum_posts',
    'forum_replies'
  )
ORDER BY tablename;

-- Expected:
-- admin: ❌ DISABLED (backend only)
-- consultation_requests: ✅ ENABLED (frontend queries)
-- users: ✅ ENABLED (frontend queries)
-- lawyer_info: ✅ ENABLED (frontend queries)
-- notifications: ✅ ENABLED (frontend queries)
-- chat_sessions: ✅ ENABLED (frontend queries)
-- chat_messages: ✅ ENABLED (frontend queries)
-- forum_posts: ✅ ENABLED (frontend queries)
-- forum_replies: ✅ ENABLED (frontend queries)
