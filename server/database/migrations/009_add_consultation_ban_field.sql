-- Migration: Add consultation ban field to users table
-- Date: 2024-11-14
-- Purpose: Support temporary bans for users who cancel accepted consultations

-- Add consultation_ban_end field to users table
ALTER TABLE users 
ADD COLUMN consultation_ban_end TIMESTAMP WITH TIME ZONE NULL;

-- Add comment to document the field
COMMENT ON COLUMN users.consultation_ban_end IS 'Timestamp when consultation booking ban expires. NULL means no active ban.';

-- Create index for efficient ban status queries
CREATE INDEX idx_users_consultation_ban_end ON users(consultation_ban_end) 
WHERE consultation_ban_end IS NOT NULL;

-- Add constraint to ensure ban_end is in the future when set
ALTER TABLE users 
ADD CONSTRAINT chk_consultation_ban_end_future 
CHECK (consultation_ban_end IS NULL OR consultation_ban_end > NOW());

-- Create function to automatically clear expired consultation bans
CREATE OR REPLACE FUNCTION clear_expired_consultation_bans()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET consultation_ban_end = NULL 
    WHERE consultation_ban_end IS NOT NULL 
    AND consultation_ban_end <= NOW();
    
    -- Log the number of bans cleared
    IF FOUND THEN
        RAISE NOTICE 'Cleared % expired consultation bans', ROW_COUNT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run the cleanup function daily
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('clear-expired-consultation-bans', '0 0 * * *', 'SELECT clear_expired_consultation_bans();');

-- For now, we'll rely on the application to check and clear expired bans
