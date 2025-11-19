-- ============================================
-- FIX: lawyer_info and lawyer_applications RLS
-- ============================================
-- The 406 errors indicate RLS is blocking queries
-- This adds proper policies for these tables
-- ============================================

-- 1. Check if RLS is enabled
SELECT 
  c.relname as tablename,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('lawyer_info', 'lawyer_applications');

-- 2. Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('lawyer_info', 'lawyer_applications');

-- ============================================
-- FIX: Add RLS policies for lawyer_info
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE public.lawyer_info ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Lawyers can view their own info" ON public.lawyer_info;
DROP POLICY IF EXISTS "Lawyers can update their own info" ON public.lawyer_info;
DROP POLICY IF EXISTS "Public can view lawyer info" ON public.lawyer_info;
DROP POLICY IF EXISTS "Service role can manage lawyer info" ON public.lawyer_info;

-- Policy 1: Lawyers can view and update their own info
CREATE POLICY "Lawyers can view their own info"
ON public.lawyer_info
FOR SELECT
TO authenticated
USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can update their own info"
ON public.lawyer_info
FOR UPDATE
TO authenticated
USING (lawyer_id = auth.uid())
WITH CHECK (lawyer_id = auth.uid());

-- Policy 2: Public can view lawyer info (for directory)
CREATE POLICY "Public can view lawyer info"
ON public.lawyer_info
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 3: Service role can manage all
CREATE POLICY "Service role can manage lawyer info"
ON public.lawyer_info
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX: Add RLS policies for lawyer_applications
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE public.lawyer_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Lawyers can view their own application" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Lawyers can update their own application" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Service role can manage applications" ON public.lawyer_applications;

-- Policy 1: Lawyers can view their own application
CREATE POLICY "Lawyers can view their own application"
ON public.lawyer_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Lawyers can update their own application
CREATE POLICY "Lawyers can update their own application"
ON public.lawyer_applications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 3: Lawyers can insert their own application
CREATE POLICY "Lawyers can insert their own application"
ON public.lawyer_applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 4: Service role can manage all
CREATE POLICY "Service role can manage applications"
ON public.lawyer_applications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_lawyer_info_lawyer_id ON public.lawyer_info(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_applications_user_id ON public.lawyer_applications(user_id);

-- ============================================
-- Analyze tables
-- ============================================

ANALYZE public.lawyer_info;
ANALYZE public.lawyer_applications;

-- ============================================
-- Verify setup
-- ============================================

SELECT 
  'lawyer_info' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'lawyer_info'
UNION ALL
SELECT 
  'lawyer_applications' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'lawyer_applications';
