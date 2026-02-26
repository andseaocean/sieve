-- Migration: Pipeline Automation
-- Adds pipeline_stage to candidates, outreach template to requests,
-- final decision fields to matches, and automation_queue table.

-- 1. Add outreach template fields to requests
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS outreach_template TEXT,
  ADD COLUMN IF NOT EXISTS outreach_template_approved BOOLEAN DEFAULT false;

-- 2. Add pipeline_stage to candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'new'
    CHECK (pipeline_stage IN (
      'new',
      'analyzed',
      'outreach_sent',
      'outreach_declined',
      'questionnaire_sent',
      'questionnaire_done',
      'test_sent',
      'test_done',
      'interview',
      'rejected',
      'hired'
    ));

-- 3. Add fields to candidate_request_matches
ALTER TABLE candidate_request_matches
  ADD COLUMN IF NOT EXISTS outreach_telegram_message_id INTEGER,
  ADD COLUMN IF NOT EXISTS final_decision TEXT DEFAULT NULL
    CHECK (final_decision IN ('invite', 'reject')),
  ADD COLUMN IF NOT EXISTS final_decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_decision_by UUID REFERENCES managers(id);

-- 4. Create automation_queue table
CREATE TABLE IF NOT EXISTS automation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'send_outreach',
    'send_questionnaire',
    'send_test_task',
    'send_rejection',
    'send_invite'
  )),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payload JSONB DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_queue_status ON automation_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_automation_queue_candidate ON automation_queue(candidate_id);
