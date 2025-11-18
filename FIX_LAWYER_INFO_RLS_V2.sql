-- ============================================
-- FIX: Simplified RLS policies for lawyer_info and lawyer_applications
-- ============================================
-- This version uses simpler, non-conflicting policies
-- ============================================

-- ============================================
-- FIX: lawyer_info table
-- ============================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Lawyers can view their own info" ON public.lawyer_info;
DROP POLICY IF EXISTS "Lawyers can update their own info" ON public.lawyer_info;
DROP POLICY IF EXISTS "Public can view lawyer info" ON public.lawyer_info;
DROP POLICY IF EXISTS "Service role can manage lawyer info" ON public.lawyer_info;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lawyer_info;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.lawyer_info;
DROP POLICY IF EXISTS "Enable update for users based on lawyer_id" ON public.lawyer_info;

-- Create ONE simple policy for SELECT (combines authenticated + public access)
CREATE POLICY "Allow all to read lawyer info"
ON public.lawyer_info
FOR SELECT
USING (true);

-- Create ONE policy for INSERT (lawyers can create their own)
CREATE POLICY "Allow lawyers to insert their own info"
ON public.lawyer_info
FOR INSERT
TO authenticated
WITH CHECK (lawyer_id = auth.uid());

-- Create ONE policy for UPDATE (lawyers can update their own)
CREATE POLICY "Allow lawyers to update their own info"
ON public.lawyer_info
FOR UPDATE
TO authenticated
USING (lawyer_id = auth.uid())
WITH CHECK (lawyer_id = auth.uid());

-- Create ONE policy for DELETE (lawyers can delete their own)
CREATE POLICY "Allow lawyers to delete their own info"
ON public.lawyer_info
FOR DELETE
TO authenticated
USING (lawyer_id = auth.uid());

-- ============================================
-- FIX: lawyer_applications table
-- ============================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Lawyers can view their own application" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Lawyers can update their own application" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Lawyers can insert their own application" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Service role can manage applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Enable read access for own application" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.lawyer_applications;

-- Create ONE simple policy for SELECT (users can read their own)
CREATE POLICY "Allow users to read their own application"
ON public.lawyer_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create ONE policy for INSERT (users can create their own)
CREATE POLICY "Allow users to insert their own application"
ON public.lawyer_applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create ONE policy for UPDATE (users can update their own)
CREATE POLICY "Allow users to update their own application"
ON public.lawyer_applications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create ONE policy for DELETE (users can delete their own)
CREATE POLICY "Allow users to delete their own application"
ON public.lawyer_applications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- Verify setup
-- ============================================

-- Check policies were created
SELECT 
  tablename,
  policyname,
  cmd as command,
  roles
FROM pg_policies 
WHERE tablename IN ('lawyer_info', 'lawyer_applications')
ORDER BY tablename, policyname;

-- Test query (should return data if you're signed in)
SELECT 'Testing lawyer_info access...' as test;
SELECT COUNT(*) as lawyer_info_count FROM public.lawyer_info;

SELECT 'Testing lawyer_applications access...' as test;
SELECT COUNT(*) as lawyer_applications_count FROM public.lawyer_applications;
