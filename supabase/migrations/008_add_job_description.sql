-- Add job_description field to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS job_description TEXT;
