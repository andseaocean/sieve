ALTER TABLE requests ADD COLUMN IF NOT EXISTS vacancy_info TEXT;

COMMENT ON COLUMN requests.vacancy_info IS
  'Specific info for candidates (onboarding, team, process). Used by Telegram bot.';
