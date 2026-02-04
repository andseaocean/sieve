-- Migration: Add AI evaluation fields to candidates table
-- Run this in Supabase SQL Editor

-- Add AI score field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS ai_score INTEGER;

-- Add AI category field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS ai_category TEXT;

-- Add AI summary field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Add index for AI score filtering
CREATE INDEX IF NOT EXISTS idx_candidates_ai_score ON candidates(ai_score);
CREATE INDEX IF NOT EXISTS idx_candidates_ai_category ON candidates(ai_category);
