-- Migration: Add specific question selection for requests
-- Allows managers to select individual questions (not just entire competencies)

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS questionnaire_question_ids UUID[] DEFAULT '{}';
