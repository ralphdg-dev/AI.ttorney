-- Migration: Create Suspension Appeals Table
-- Purpose: Allow suspended users to appeal their suspensions
-- Date: 2025-10-31

CREATE TABLE suspension_appeals (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suspension_id UUID NOT NULL REFERENCES user_suspensions(id) ON DELETE CASCADE,
  
  -- Appeal Content
  appeal_reason TEXT NOT NULL,  -- User's explanation/justification
  additional_context TEXT,       -- Optional additional information
  
  -- Appeal Status
  status TEXT DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  
  -- Admin Review
  reviewed_by UUID REFERENCES users(id),  -- Admin who reviewed the appeal
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,                        -- Admin's internal notes
  rejection_reason TEXT,                   -- Reason for rejection (shown to user)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_suspension_appeals_user_id ON suspension_appeals(user_id);
CREATE INDEX idx_suspension_appeals_suspension_id ON suspension_appeals(suspension_id);
CREATE INDEX idx_suspension_appeals_status ON suspension_appeals(status);
CREATE INDEX idx_suspension_appeals_created ON suspension_appeals(created_at DESC);

-- Ensure one appeal per suspension
CREATE UNIQUE INDEX idx_one_appeal_per_suspension ON suspension_appeals(suspension_id);

-- Comments for documentation
COMMENT ON TABLE suspension_appeals IS 'Tracks user appeals for suspensions';
COMMENT ON COLUMN suspension_appeals.status IS 'pending: awaiting review, under_review: admin reviewing, approved: suspension lifted, rejected: appeal denied';
COMMENT ON COLUMN suspension_appeals.rejection_reason IS 'User-facing reason for rejection';
COMMENT ON COLUMN suspension_appeals.admin_notes IS 'Internal admin notes, not shown to user';
