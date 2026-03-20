-- Migration 015: Vacancy Binding
-- Binds candidates to specific job vacancies

-- 1. Add primary_request_id to candidates
ALTER TABLE candidates
  ADD COLUMN primary_request_id UUID REFERENCES requests(id) ON DELETE SET NULL;

-- 2. Add applied_request_ids to candidates (vacancies selected during application)
ALTER TABLE candidates
  ADD COLUMN applied_request_ids UUID[] DEFAULT '{}';

-- 3. Create candidate_request_history table
CREATE TABLE candidate_request_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  from_request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  to_request_id   UUID REFERENCES requests(id) ON DELETE SET NULL,
  changed_by    UUID REFERENCES managers(id) ON DELETE SET NULL,
  reason        TEXT, -- 'initial_application' | 'manager_reassign' | 'new_request_scan' | 'auto_best_match'
  notes         TEXT, -- free comment from manager on manual change
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX idx_candidate_request_history_candidate ON candidate_request_history(candidate_id);
CREATE INDEX idx_candidates_primary_request ON candidates(primary_request_id);
