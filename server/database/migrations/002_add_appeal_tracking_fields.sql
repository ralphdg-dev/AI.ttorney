-- Migration: Add appeal tracking fields to existing tables
-- Description: Enhance user_suspensions and users tables with appeal-related fields
-- Created: 2025-10-31

-- Add appeal tracking to user_suspensions table
ALTER TABLE user_suspensions
ADD COLUMN IF NOT EXISTS has_appeal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS appeal_id UUID REFERENCES user_suspension_appeals(id) ON DELETE SET NULL;

-- Add appeal notification flag to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_pending_appeal_response BOOLEAN DEFAULT FALSE;

-- Create index for appeal lookups
CREATE INDEX IF NOT EXISTS idx_user_suspensions_appeal_id ON user_suspensions(appeal_id) WHERE appeal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_pending_appeal_response ON users(has_pending_appeal_response) WHERE has_pending_appeal_response = TRUE;

-- Add comments
COMMENT ON COLUMN user_suspensions.has_appeal IS 'Indicates if this suspension has an associated appeal';
COMMENT ON COLUMN user_suspensions.appeal_id IS 'Reference to the appeal record if one exists';
COMMENT ON COLUMN users.has_pending_appeal_response IS 'Flag to notify user that their appeal has been reviewed';
