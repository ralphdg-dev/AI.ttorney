-- ============================================================================
-- SUPABASE MIGRATIONS - Copy this to Supabase SQL Editor
-- ============================================================================
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute all migrations
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES (Clean Slate)
-- ============================================================================

-- Consultation Requests
DROP POLICY IF EXISTS "Users can view own consultation requests" ON consultation_requests;
DROP POLICY IF EXISTS "Lawyers can view assigned consultations" ON consultation_requests;
DROP POLICY IF EXISTS "Users can create consultation requests" ON consultation_requests;
DROP POLICY IF EXISTS "Users can update own consultation requests" ON consultation_requests;
DROP POLICY IF EXISTS "Lawyers can update assigned consultations" ON consultation_requests;

-- Users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Lawyers can view user info in consultations" ON users;

-- Lawyer Info
DROP POLICY IF EXISTS "Anyone can view verified lawyer info" ON lawyer_info;
DROP POLICY IF EXISTS "Lawyers can update own info" ON lawyer_info;
DROP POLICY IF EXISTS "Lawyers can insert own info" ON lawyer_info;
DROP POLICY IF EXISTS "Users can view lawyer info in consultations" ON lawyer_info;

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;

-- Chat Sessions & Messages
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create chat messages" ON chat_messages;

-- ============================================================================
-- STEP 2: GLOSSARY TERMS - PUBLIC ACCESS (Fix for 500 error)
-- ============================================================================

-- Enable RLS on glossary_terms
ALTER TABLE glossary_terms ENABLE ROW LEVEL SECURITY;

-- Allow public read access to glossary terms (for the app)
CREATE POLICY "Enable public read access to glossary terms" ON glossary_terms FOR SELECT USING (true);

-- ============================================================================
-- STEP 3: LEGAL ARTICLES - PUBLIC ACCESS
-- ============================================================================

-- Enable RLS on legal_articles
ALTER TABLE legal_articles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to legal articles (for the app)
CREATE POLICY "Enable public read access to legal articles" ON legal_articles FOR SELECT USING (true);

-- ============================================================================
-- STEP 4: CONSULTATION REQUESTS - PRODUCTION POLICIES
-- ============================================================================

-- Users can view their own consultation requests
CREATE POLICY "Users can view own consultation requests" 
ON consultation_requests FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create consultation requests
CREATE POLICY "Users can create consultation requests" 
ON consultation_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own consultation requests
CREATE POLICY "Users can update own consultation requests" 
ON consultation_requests FOR UPDATE 
USING (auth.uid() = user_id);

-- Lawyers can view assigned consultations
CREATE POLICY "Lawyers can view assigned consultations" 
ON consultation_requests FOR SELECT 
USING (
  lawyer_id IN (
    SELECT id FROM lawyer_info WHERE lawyer_id = auth.uid()
  )
);

-- Lawyers can update assigned consultations
CREATE POLICY "Lawyers can update assigned consultations" 
ON consultation_requests FOR UPDATE 
USING (
  lawyer_id IN (
    SELECT id FROM lawyer_info WHERE lawyer_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 5: USERS TABLE - PRODUCTION POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Lawyers can view user info for their consultations (needed for joins)
CREATE POLICY "Lawyers can view user info in consultations"
ON users FOR SELECT
USING (
  -- Allow if this is the user viewing their own profile
  auth.uid() = id
  OR
  -- Allow if lawyer has a consultation with this user
  id IN (
    SELECT user_id FROM consultation_requests 
    WHERE lawyer_id IN (
      SELECT id FROM lawyer_info WHERE lawyer_id = auth.uid()
    )
  )
);

-- ============================================================================
-- STEP 6: LAWYER_INFO TABLE - PRODUCTION POLICIES
-- ============================================================================

-- Everyone can view lawyer info (public directory)
CREATE POLICY "Anyone can view lawyer info"
ON lawyer_info FOR SELECT
USING (true);

-- Lawyers can update their own info
CREATE POLICY "Lawyers can update own info"
ON lawyer_info FOR UPDATE
USING (auth.uid() = lawyer_id);

-- Lawyers can insert their own info (after verification)
CREATE POLICY "Lawyers can insert own info"
ON lawyer_info FOR INSERT
WITH CHECK (auth.uid() = lawyer_id);

-- ============================================================================
-- STEP 7: NOTIFICATIONS - PRODUCTION POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- Allow service role to insert notifications (bypasses RLS anyway)
CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- STEP 8: CHAT SESSIONS & MESSAGES - PRODUCTION POLICIES
-- ============================================================================

-- Users can view their own chat sessions
CREATE POLICY "Users can view own chat sessions"
ON chat_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own chat sessions
CREATE POLICY "Users can create own chat sessions"
ON chat_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own chat sessions
CREATE POLICY "Users can update own chat sessions"
ON chat_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own chat sessions
CREATE POLICY "Users can delete own chat sessions"
ON chat_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Users can view messages in their sessions
CREATE POLICY "Users can view own chat messages"
ON chat_messages FOR SELECT
USING (
  session_id IN (
    SELECT id FROM chat_sessions WHERE user_id = auth.uid()
  )
);

-- Users can create messages in their sessions
CREATE POLICY "Users can create chat messages"
ON chat_messages FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT id FROM chat_sessions WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 9: VERIFY RLS IS ENABLED
-- ============================================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'consultation_requests',
    'users',
    'lawyer_info',
    'notifications',
    'chat_sessions',
    'chat_messages',
    'glossary_terms',
    'legal_articles'
  )
ORDER BY tablename;

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN roles = '{public}' THEN 'PUBLIC'
    ELSE array_to_string(roles, ', ')
  END as roles
FROM pg_policies 
WHERE tablename IN (
    'consultation_requests',
    'users',
    'lawyer_info',
    'notifications',
    'chat_sessions',
    'chat_messages',
    'glossary_terms',
    'legal_articles'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ All database migrations applied successfully!' as status,
       '🎉 Your AI.ttorney database is now ready for production use!' as message;
