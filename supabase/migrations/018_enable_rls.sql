-- Enable RLS on sensitive tables.
-- No policies needed: service_role bypasses RLS automatically.
-- anon key will have no access to these tables.

ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_managers ENABLE ROW LEVEL SECURITY;
