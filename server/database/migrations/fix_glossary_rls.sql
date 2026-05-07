-- ============================================================================
-- FIX GLOSSARY TERMS RLS ISSUE
-- ============================================================================
-- Disable RLS on glossary_terms to match other tables

ALTER TABLE glossary_terms DISABLE ROW LEVEL SECURITY;

-- Verify the change
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'glossary_terms';
