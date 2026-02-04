-- Migration: Add full AI analysis fields to candidates table
-- Run this in Supabase SQL Editor

-- Add AI strengths field (array of text)
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS ai_strengths TEXT[];

-- Add AI concerns field (array of text)
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS ai_concerns TEXT[];

-- Add AI recommendation field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;

-- Add AI reasoning field
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
