-- Check if the user exists in the database
-- Run this in Supabase SQL Editor

SELECT 
  id,
  email,
  username,
  full_name,
  role,
  account_status,
  created_at
FROM public.users 
WHERE id = 'ef887550-7777-4501-be9c-7c43e583fd2e';

-- If this returns NO ROWS, that's the problem!
-- The user exists in auth.users but not in public.users

-- To check auth.users:
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE id = 'ef887550-7777-4501-be9c-7c43e583fd2e';

-- If user exists in auth.users but NOT in public.users,
-- you need to create the user row manually or fix registration
