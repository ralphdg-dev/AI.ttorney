-- Migration: Create user_suspension_appeals table
-- Description: Table to store suspension appeal requests and admin reviews
-- Created: 2025-10-31

-- Create user_suspension_appeals table
CREATE TABLE IF NOT EXISTS user_suspension_appeals (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suspension_id UUID NOT NULL REFERENCES user_suspensions(id) ON DELETE CASCADE,
  
  -- Appeal Details (User-submitted)
  appeal_reason TEXT NOT NULL CHECK (char_length(appeal_reason) >= 10 AND char_length(appeal_reason) <= 200),
  appeal_message TEXT NOT NULL CHECK (char_length(appeal_message) >= 50 AND char_length(appeal_message) <= 2000),
  evidence_urls TEXT[] DEFAULT '{}',
  
  -- Status Tracking
  status TEXT DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  
  -- Admin Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_response TEXT,
  admin_notes TEXT,
  
  -- Decision Details
  decision TEXT CHECK (decision IN ('lift_suspension', 'reduce_duration', 'reject')),
  original_end_date TIMESTAMP WITH TIME ZONE,
  new_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_user_id ON user_suspension_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_suspension_id ON user_suspension_appeals(suspension_id);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_status ON user_suspension_appeals(status);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_created ON user_suspension_appeals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_reviewed_by ON user_suspension_appeals(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Constraint: Only one active appeal per suspension
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_appeal_per_suspension 
ON user_suspension_appeals(suspension_id) 
WHERE status IN ('pending', 'under_review');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_suspension_appeals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_suspension_appeals_updated_at
  BEFORE UPDATE ON user_suspension_appeals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_suspension_appeals_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_suspension_appeals IS 'Stores user suspension appeal requests and admin review decisions';
COMMENT ON COLUMN user_suspension_appeals.appeal_reason IS 'Short summary of why user is appealing (10-200 chars)';
COMMENT ON COLUMN user_suspension_appeals.appeal_message IS 'Detailed explanation from user (50-2000 chars)';
COMMENT ON COLUMN user_suspension_appeals.evidence_urls IS 'Array of URLs to supporting evidence stored in Supabase Storage';
COMMENT ON COLUMN user_suspension_appeals.status IS 'Current status: pending, under_review, approved, rejected';
COMMENT ON COLUMN user_suspension_appeals.decision IS 'Admin decision: lift_suspension, reduce_duration, reject';
COMMENT ON COLUMN user_suspension_appeals.admin_response IS 'Response shown to user explaining the decision';
COMMENT ON COLUMN user_suspension_appeals.admin_notes IS 'Internal admin notes (not shown to user)';
