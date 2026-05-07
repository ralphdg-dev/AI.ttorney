-- ============================================================================
-- EMERGENCY DATABASE REPAIR - Fix Users Table Schema
-- ============================================================================
-- Run this in Supabase SQL Editor immediately to restore signup functionality
-- ============================================================================

-- First, let's see what columns we currently have
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns that the signup service expects
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure RLS is properly configured for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Lawyers can view user info in consultations" ON users;

-- Create proper policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Lawyers can view user info in consultations" ON users FOR SELECT USING (
  auth.uid() = id OR 
  id IN (
    SELECT user_id FROM consultation_requests 
    WHERE lawyer_id IN (
      SELECT id FROM lawyer_info WHERE lawyer_id = auth.uid()
    )
  )
);

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show success message
SELECT '✅ Users table schema repaired successfully!' as status,
       '🎉 Signup functionality should now work!' as message;
