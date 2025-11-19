-- ============================================
-- FIX: Users Table RLS Policies
-- ============================================
-- This migration ensures proper Row Level Security policies
-- are in place for the users table to prevent timeout errors
-- ============================================

-- Enable RLS on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON public.users;

-- ============================================
-- POLICY 1: Allow users to view their own profile
-- ============================================
-- This is the CRITICAL policy that prevents timeout errors
-- Users MUST be able to SELECT their own row from the users table
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- POLICY 2: Allow users to update their own profile
-- ============================================
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- POLICY 3: Allow service role to read all users
-- ============================================
-- This allows backend services to query user data
CREATE POLICY "Service role can read all users"
ON public.users
FOR SELECT
TO service_role
USING (true);

-- ============================================
-- POLICY 4: Allow service role to update all users
-- ============================================
-- This allows backend services to update user data
CREATE POLICY "Service role can update all users"
ON public.users
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- POLICY 5: Allow authenticated users to insert (for registration)
-- ============================================
CREATE POLICY "Enable insert for authentication"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================
-- Verify RLS is enabled
-- ============================================
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'users') THEN
    RAISE EXCEPTION 'RLS is not enabled on users table!';
  END IF;
  
  RAISE NOTICE 'RLS policies successfully configured for users table';
END $$;
