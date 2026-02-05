-- Migration: Add Outreach System
-- Description: Adds automated outreach functionality for warm candidates

-- ============================================
-- 1. Extend candidates table with outreach fields
-- ============================================

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS telegram_username TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_methods TEXT[] DEFAULT ARRAY['email']::TEXT[],
ADD COLUMN IF NOT EXISTS outreach_status TEXT DEFAULT 'pending'
  CHECK (outreach_status IN ('pending', 'scheduled', 'sent', 'responded', 'declined', 'cancelled')),
ADD COLUMN IF NOT EXISTS outreach_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS candidate_response TEXT;

-- Create index for outreach status queries
CREATE INDEX IF NOT EXISTS idx_candidates_outreach_status ON candidates(outreach_status);

-- ============================================
-- 2. Extend requests table with test task URL
-- ============================================

ALTER TABLE requests
ADD COLUMN IF NOT EXISTS test_task_notion_url TEXT;

-- ============================================
-- 3. Create outreach_queue table
-- ============================================

CREATE TABLE IF NOT EXISTS outreach_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,

  -- Message content
  intro_message TEXT NOT NULL,
  test_task_message TEXT,

  -- Delivery configuration
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'telegram')),
  scheduled_for TIMESTAMPTZ NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  retry_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,

  -- Manager editing
  edited_by UUID REFERENCES managers(id),
  edited_at TIMESTAMPTZ
);

-- Indexes for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_outreach_queue_scheduled ON outreach_queue(scheduled_for, status)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_outreach_queue_candidate ON outreach_queue(candidate_id);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_status ON outreach_queue(status);

-- ============================================
-- 4. Create outreach_messages history table
-- ============================================

CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,

  -- Message details
  message_type TEXT NOT NULL CHECK (message_type IN ('intro', 'test_task', 'follow_up')),
  content TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'telegram')),

  -- Delivery tracking
  sent_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Response tracking
  response TEXT,
  responded_at TIMESTAMPTZ,

  -- External tracking
  external_message_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for candidate message history
CREATE INDEX IF NOT EXISTS idx_outreach_messages_candidate ON outreach_messages(candidate_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_sent_at ON outreach_messages(sent_at);

-- ============================================
-- 5. Enable RLS (Row Level Security)
-- ============================================

ALTER TABLE outreach_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Allow authenticated users to view outreach_queue" ON outreach_queue;
DROP POLICY IF EXISTS "Allow authenticated users to insert outreach_queue" ON outreach_queue;
DROP POLICY IF EXISTS "Allow authenticated users to update outreach_queue" ON outreach_queue;
DROP POLICY IF EXISTS "Allow service role full access to outreach_queue" ON outreach_queue;

DROP POLICY IF EXISTS "Allow authenticated users to view outreach_messages" ON outreach_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert outreach_messages" ON outreach_messages;
DROP POLICY IF EXISTS "Allow service role full access to outreach_messages" ON outreach_messages;

-- Policies for outreach_queue
CREATE POLICY "Allow authenticated users to view outreach_queue"
  ON outreach_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert outreach_queue"
  ON outreach_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update outreach_queue"
  ON outreach_queue FOR UPDATE
  TO authenticated
  USING (true);

-- Policies for outreach_messages
CREATE POLICY "Allow authenticated users to view outreach_messages"
  ON outreach_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert outreach_messages"
  ON outreach_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow service role full access (for cron jobs)
CREATE POLICY "Allow service role full access to outreach_queue"
  ON outreach_queue FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role full access to outreach_messages"
  ON outreach_messages FOR ALL
  TO service_role
  USING (true);
