-- Додаємо стовпець для зберігання екстрагованих даних з резюме
ALTER TABLE candidates
ADD COLUMN resume_extracted_data JSONB;

-- Індекс для швидкого пошуку по навичках
CREATE INDEX idx_candidates_resume_skills
ON candidates USING GIN ((resume_extracted_data->'extracted'->'skills'));

-- Коментар
COMMENT ON COLUMN candidates.resume_extracted_data IS
'JSON with extracted resume data: experience, skills, education, contact';
