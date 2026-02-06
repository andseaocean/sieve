-- Phase 8: Test Task Automation System
-- Adds test task tracking to candidates + conversation history table

-- 1. Candidates: test task tracking fields
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_status TEXT DEFAULT 'not_sent';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_sent_at TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_original_deadline TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_current_deadline TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_extensions_count INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_submitted_at TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_submission_text TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_candidate_feedback TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_ai_score INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_ai_evaluation TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS test_task_late_by_hours INTEGER;

-- 2. Candidate conversations table
CREATE TABLE IF NOT EXISTS candidate_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    message_type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_candidate ON candidate_conversations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_conversations_sent_at ON candidate_conversations(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON candidate_conversations(message_type);
CREATE INDEX IF NOT EXISTS idx_candidates_test_task_status ON candidates(test_task_status) WHERE test_task_status IN ('sent', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_candidates_test_deadline ON candidates(test_task_current_deadline) WHERE test_task_status = 'sent';
