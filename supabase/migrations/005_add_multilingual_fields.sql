-- Migration: Add multilingual support fields
-- Description: Adds language tracking and translation fields to candidates table

-- Add language tracking columns
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS original_language VARCHAR(5) DEFAULT 'uk',
ADD COLUMN IF NOT EXISTS translated_to VARCHAR(5);

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_candidates_original_language ON candidates(original_language);

-- Add columns for translated content
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS about_text_translated TEXT,
ADD COLUMN IF NOT EXISTS why_vamos_translated TEXT,
ADD COLUMN IF NOT EXISTS key_skills_translated TEXT;

-- Update existing candidates to have Ukrainian as default
-- and copy original content to translated fields
UPDATE candidates
SET
    original_language = COALESCE(original_language, 'uk'),
    translated_to = 'uk',
    about_text_translated = COALESCE(about_text_translated, about_text),
    why_vamos_translated = COALESCE(why_vamos_translated, why_vamos),
    key_skills_translated = COALESCE(key_skills_translated, array_to_string(key_skills, ', '))
WHERE original_language IS NULL OR translated_to IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN candidates.original_language IS 'Language code of the original submission (uk, en, tr, es)';
COMMENT ON COLUMN candidates.translated_to IS 'Language code the content was translated to (always uk for manager view)';
COMMENT ON COLUMN candidates.about_text_translated IS 'Ukrainian translation of about_text field';
COMMENT ON COLUMN candidates.why_vamos_translated IS 'Ukrainian translation of why_vamos field';
COMMENT ON COLUMN candidates.key_skills_translated IS 'Ukrainian translation of key_skills (as comma-separated string)';
