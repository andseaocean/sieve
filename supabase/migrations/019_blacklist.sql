-- Migration 019: Add blacklist fields to candidates table

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blacklisted_by UUID REFERENCES managers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_candidates_blacklisted ON candidates(is_blacklisted) WHERE is_blacklisted = true;
