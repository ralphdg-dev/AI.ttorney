-- Migration: Add acknowledged column to lawyer_applications table
-- This column tracks whether a rejected application has been acknowledged by the user
-- When acknowledged=true and status=rejected, user must wait 1 year before reapplying

ALTER TABLE lawyer_applications 
ADD COLUMN acknowledged BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column purpose
COMMENT ON COLUMN lawyer_applications.acknowledged IS 'Tracks whether user has acknowledged a rejected application. When true, user must wait 1 year before reapplying.';

-- Update existing rejected applications to have acknowledged=false by default
UPDATE lawyer_applications 
SET acknowledged = FALSE 
WHERE status = 'rejected' AND acknowledged IS NULL;
