-- TEMPORARY FIX: Disable RLS to test if that's the issue
-- Run this in Supabase SQL Editor

-- Disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- This will allow all queries to work without RLS checks
-- WARNING: This is NOT secure for production!
-- Only use this to test if RLS is the problem

-- After testing, if login works, we know RLS is the issue
-- Then we can re-enable it and fix the policies properly

-- To re-enable RLS later:
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
