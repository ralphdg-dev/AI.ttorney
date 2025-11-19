-- ============================================
-- DEBUG: Why lawyer profile fetch is slow
-- ============================================

-- 1. Check users table structure
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Test query speed for lawyer role specifically
EXPLAIN ANALYZE
SELECT * FROM public.users 
WHERE id = auth.uid() 
  AND role = 'verified_lawyer';

-- 3. Check if there are any foreign keys or relationships
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'users' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Check for any triggers on users table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 5. Count users by role
SELECT 
  role,
  COUNT(*) as count
FROM public.users
GROUP BY role;

-- 6. Check table size
SELECT 
  pg_size_pretty(pg_total_relation_size('public.users')) as total_size,
  pg_size_pretty(pg_relation_size('public.users')) as table_size,
  pg_size_pretty(pg_indexes_size('public.users')) as indexes_size;

-- 7. Test simple lawyer query
EXPLAIN ANALYZE
SELECT id, email, role, full_name 
FROM public.users 
WHERE role = 'verified_lawyer' 
LIMIT 1;
