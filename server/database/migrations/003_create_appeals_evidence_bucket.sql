-- Migration: Create Supabase Storage bucket for appeal evidence
-- Description: Creates the appeals_evidence bucket with appropriate policies
-- Created: 2025-10-31
-- Note: This should be run in Supabase SQL Editor or via Supabase CLI

-- Create storage bucket for appeal evidence
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'appeals_evidence',
  'appeals_evidence',
  false, -- Not public, requires authentication
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own evidence
CREATE POLICY "Users can upload appeal evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'appeals_evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own evidence
CREATE POLICY "Users can view their own appeal evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'appeals_evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can view all evidence
CREATE POLICY "Admins can view all appeal evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'appeals_evidence' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  )
);

-- Policy: Users can delete their own evidence (before appeal submission)
CREATE POLICY "Users can delete their own appeal evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'appeals_evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add comment
COMMENT ON TABLE storage.buckets IS 'Storage bucket for user suspension appeal evidence files';
