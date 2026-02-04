-- Migration: Add sourcing fields to candidates table
-- Run this in Supabase SQL Editor

-- Add sourcing method field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS sourcing_method TEXT
DEFAULT 'form';

-- Add profile URL field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS profile_url TEXT;

-- Add platform field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add current position field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS current_position TEXT;

-- Add location field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add experience years field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS experience_years INTEGER;

-- Add outreach message field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS outreach_message TEXT;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_candidates_sourcing_method ON candidates(sourcing_method);
CREATE INDEX IF NOT EXISTS idx_candidates_platform ON candidates(platform);

-- Update existing candidates to have sourcing_method = 'form'
UPDATE candidates SET sourcing_method = 'form' WHERE sourcing_method IS NULL;
