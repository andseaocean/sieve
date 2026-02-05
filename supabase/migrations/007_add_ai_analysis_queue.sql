-- Migration: Add AI Analysis Queue
-- Description: Queue table for background AI analysis processing

-- ============================================
-- 1. Create ai_analysis_queue table
-- ============================================

CREATE TABLE IF NOT EXISTS ai_analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Ensure one queue entry per candidate
  CONSTRAINT unique_pending_candidate UNIQUE (candidate_id)
);

-- ============================================
-- 2. Create indexes
-- ============================================

-- Index for fetching pending items (most common query)
CREATE INDEX IF NOT EXISTS idx_ai_queue_pending
  ON ai_analysis_queue(created_at)
  WHERE status = 'pending';

-- Index for candidate lookup
CREATE INDEX IF NOT EXISTS idx_ai_queue_candidate
  ON ai_analysis_queue(candidate_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_ai_queue_status
  ON ai_analysis_queue(status);

-- ============================================
-- 3. Enable RLS
-- ============================================

ALTER TABLE ai_analysis_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running migration
DROP POLICY IF EXISTS "Service role full access to ai_analysis_queue" ON ai_analysis_queue;

-- Allow service role full access (for cron jobs)
CREATE POLICY "Service role full access to ai_analysis_queue"
  ON ai_analysis_queue FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- 4. Add comment
-- ============================================

COMMENT ON TABLE ai_analysis_queue IS
  'Queue for background AI analysis of candidates. Processed by cron job every 5 minutes.';
