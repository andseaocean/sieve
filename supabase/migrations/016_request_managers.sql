-- Add created_by to requests
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES managers(id) ON DELETE SET NULL;

-- Table: managers of a vacancy (many-to-many)
CREATE TABLE IF NOT EXISTS request_managers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  manager_id  UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  added_by    UUID REFERENCES managers(id) ON DELETE SET NULL,
  UNIQUE(request_id, manager_id)
);

CREATE INDEX IF NOT EXISTS idx_request_managers_request ON request_managers(request_id);
CREATE INDEX IF NOT EXISTS idx_request_managers_manager ON request_managers(manager_id);
