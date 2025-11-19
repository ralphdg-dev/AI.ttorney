-- ============================================
-- OPTIMIZE: Users Table RLS Performance
-- ============================================
-- This migration optimizes RLS performance to prevent timeout errors
-- by adding proper indexes and optimizing policy checks
-- ============================================

-- ============================================
-- STEP 1: Add indexes for fast RLS lookups
-- ============================================

-- Index on id for fast primary key lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);

-- Index on email for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Index on account_status for status checks
CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users(account_status);

-- ============================================
-- STEP 2: Optimize RLS policies for performance
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can read all users" ON public.users;
DROP POLICY IF EXISTS "Service role can update all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON public.users;

-- OPTIMIZED POLICY 1: Allow users to view their own profile
-- Using indexed column for fast lookup
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- OPTIMIZED POLICY 2: Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- POLICY 3: Allow service role to read all users
CREATE POLICY "Service role can read all users"
ON public.users
FOR SELECT
TO service_role
USING (true);

-- POLICY 4: Allow service role to update all users
CREATE POLICY "Service role can update all users"
ON public.users
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- POLICY 5: Allow service role to insert users
CREATE POLICY "Service role can insert users"
ON public.users
FOR INSERT
TO service_role
WITH CHECK (true);

-- POLICY 6: Allow authenticated users to insert (for registration)
CREATE POLICY "Enable insert for authentication"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================
-- STEP 3: Analyze table for query optimization
-- ============================================
ANALYZE public.users;

-- ============================================
-- STEP 4: Verify setup
-- ============================================
DO $$
DECLARE
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check RLS is enabled
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'RLS is not enabled on users table!';
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'users' AND schemaname = 'public';
  
  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'users' AND schemaname = 'public';
  
  RAISE NOTICE 'RLS optimization complete:';
  RAISE NOTICE '  - RLS enabled: YES';
  RAISE NOTICE '  - Policies configured: %', policy_count;
  RAISE NOTICE '  - Indexes created: %', index_count;
  RAISE NOTICE '  - Performance optimized for fast auth lookups';
END $$;
