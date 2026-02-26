-- Migration: Add Soft Skills Questionnaire System
-- Adds competencies, questions bank, and questionnaire responses

-- 1. Компетенції (категорії soft skills)
CREATE TABLE IF NOT EXISTS soft_skill_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Банк питань
CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id UUID REFERENCES soft_skill_competencies(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  text_translations JSONB DEFAULT '{}',
  is_universal BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Відповіді кандидатів
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'sent'
    CHECK (status IN ('sent', 'in_progress', 'completed', 'expired')),
  questions JSONB NOT NULL,
  answers JSONB DEFAULT '{}',
  ai_score INTEGER,
  ai_evaluation JSONB,
  sent_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Індекси
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_candidate ON questionnaire_responses(candidate_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_token ON questionnaire_responses(token);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_competency ON questionnaire_questions(competency_id);

-- 5. Зміни в існуючих таблицях
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS questionnaire_competency_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS questionnaire_custom_questions JSONB DEFAULT '[]';

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS questionnaire_status TEXT DEFAULT NULL
    CHECK (questionnaire_status IN ('sent', 'in_progress', 'completed', 'expired', 'skipped'));

-- 6. RLS політики
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read by token" ON questionnaire_responses
  FOR SELECT USING (true);

CREATE POLICY "Service role full access" ON questionnaire_responses
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE soft_skill_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers read competencies" ON soft_skill_competencies FOR SELECT USING (true);
CREATE POLICY "Managers write competencies" ON soft_skill_competencies FOR ALL USING (true);
CREATE POLICY "Managers read questions" ON questionnaire_questions FOR SELECT USING (true);
CREATE POLICY "Managers write questions" ON questionnaire_questions FOR ALL USING (true);
