-- Remove the notification type constraint to allow any type
-- This allows 'violation_warning' and any future notification types

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;

-- No constraint added - notifications.type can now be any varchar value
-- This provides flexibility for adding new notification types without migrations

-- Add comment to document common types
COMMENT ON COLUMN notifications.type IS 
'Notification type - common values: reply, post, like, follow, consultation, lawyer_application_update, violation_warning';
