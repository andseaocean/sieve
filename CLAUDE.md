# Sieve — AI-Powered Recruitment Platform

## Rules for Claude

- **Keep this file up to date.** After any structural changes to the project (new/removed files, tables, API routes, integrations, environment variables, dependencies, or significant business logic changes), update the relevant sections of this CLAUDE.md before finishing the task.
- Communicate with the user in the same language they use (default: Ukrainian).

## Project Overview

Sieve (package name: `hiring-system`) is an AI-powered recruitment platform for **Vamos** (AI-first tech company). It automates candidate screening, matching, and outreach. Primary UI language is Ukrainian.

**Candidate flow:** Application/Sourcing -> AI Analysis (1-10 score) -> Matching to requests -> **Manual Outreach** (manager generates + sends via dashboard) -> **Soft Skills Questionnaire** (starts in Telegram bot on button click) -> **Test Task** (manager sends manually after reviewing questionnaire) -> Evaluation -> **Final Decision** (invite/reject by manager) -> Interview/Rejection

**Pipeline stages:** `new` → `analyzed` → `outreach_sent` → `questionnaire_sent` → `questionnaire_done` → `test_sent` → `test_done` → `interview` | `rejected` | `hired` | `outreach_declined`

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui (Radix primitives), Lucide icons, next-themes
- **Database:** Supabase (PostgreSQL), Supabase Storage (resume uploads), RLS enabled
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`) via `/lib/ai/claude.ts`
- **Auth:** NextAuth.js 4 (credentials provider, JWT strategy)
- **Email:** Resend API
- **Bot:** Telegram Bot API (node-telegram-bot-api), Telegram Mini App
- **Deploy:** Vercel, Vercel Cron (daily at 10:00 UTC)
- **PDF:** Native Claude API PDF support (document blocks), Supabase Storage for file hosting
- **Validation:** Zod, React Hook Form

## Directory Structure

```
app/
  (auth)/login/                   # Login page
  (dashboard)/dashboard/          # Protected manager area
    page.tsx                      # Dashboard home (stats)
    candidates/                   # Candidate list + detail [id]
    requests/                     # Hiring requests list + new + detail [id]
    sourcing/                     # Quick check (bookmarklet) + setup
    settings/                     # Company Info settings page (admin only)
    settings/questionnaire/       # Soft Skills admin (competency/question bank)
  (public)/                       # Minimal layout wrapper
    apply/                        # Application form (Telegram Mini App + web fallback)
    thank-you/                    # Post-submission confirmation page
  page.tsx                        # Root redirect → /login
  submit-test/                    # Test task submission page
  questionnaire/[token]/          # Public questionnaire form (token-based access)
  api/                            # API routes (see below)

components/
  candidates/
    VacancySelector.tsx           # Vacancy multi-select (used in application form via Telegram Mini App)
    VacancyBlock.tsx              # Primary vacancy block in candidate detail
    BlacklistButton.tsx           # Blacklist/unblacklist button + dialog (candidate header)
    PipelineStageEditor.tsx       # Manual pipeline stage change dialog (candidate detail)
    MatchedVacancies.tsx          # "Also fits" block in candidate detail
    RequestHistory.tsx            # Collapsible vacancy change history
  requests/
    CandidateScanResults.tsx      # Base scan results on vacancy page
    RequestCard.tsx               # Vacancy card (list view; shows author + manager count)
    RequestTeam.tsx               # "Команда" sidebar block (author + managers, add/remove)
    RequestForm.tsx               # Create/edit vacancy form
    RecommendedCandidates.tsx     # "Рекомендовані" tab — candidates from other pipelines with matching questionnaire scores
  ui/                             # shadcn/ui primitives
  candidates/                     # CandidateCard, CandidateFilters, ResumeViewer, etc.
    PriorityBlock.tsx           # Пріоритетний блок за pipeline_stage (картка кандидата)
    CandidateTOC.tsx            # Sticky зміст картки (права колонка, вкладка Основне)
    AIPortraitTab.tsx           # Вкладка AI-портрет (зведення всіх AI-коментарів)
    ConversationsTab.tsx        # Вкладка Хронологія (candidate_conversations)
  dashboard/                      # Header, Sidebar
    InboxBlock.tsx              # Inbox-блок на головному дашборді (потребують уваги)
    test-task/                    # TestTaskTimeline (timeline, submission preview, decision panel)
    questionnaire/                # QuestionnaireSection (candidate detail integration)
    pipeline-timeline.tsx         # Visual pipeline stage progress (dots + connector lines)
    final-decision-panel.tsx      # Manager invite/reject decision UI
  settings/                       # Admin settings components
    questionnaire-settings.tsx    # Competency/question bank management
    competency-card.tsx           # Competency card with questions list
    competency-dialog.tsx         # Create/edit competency dialog
    question-dialog.tsx           # Create/edit question dialog
  outreach/                       # Outreach management UI
  requests/                       # RequestForm, RequestCard, RequestTeam
  sourcing/                       # ProfilePreview, EvaluationCard, SaveCandidateDialog

lib/
  ai/                             # AI layer
    claude.ts                     # analyzeWithClaude() wrapper
    prompts.ts                    # Analysis/matching prompts
    outreach-prompts.ts           # Outreach + test task decision message prompts
    classifyResponse.ts           # Classify candidate Telegram responses
    evaluateTestTask.ts           # AI test task evaluation
    evaluateQuestionnaire.ts      # AI soft skills questionnaire evaluation
  auth/auth.ts                    # NextAuth config
  supabase/
    client.ts                     # Supabase client factory (anon + service role)
    types.ts                      # DB types (~500 lines, auto-generated style)
  telegram/
    bot.ts                        # Bot init + polling mode
    types.ts                      # Telegram types
    answer-question.ts            # AI answer generator (Company Info + vacancy context)
  automation/
    queue.ts                      # Automation queue utilities (add, fetch, mark, cancel)
    handlers.ts                   # 5 automation handlers (outreach, questionnaire, test, invite, rejection)
  outreach/
    scheduler.ts                  # Schedule messages
    processor.ts                  # Process outreach queue
    email-service.ts              # Resend integration
    message-generator.ts          # AI message generation + generatePersonalizedOutreach()
    schedule-outreach.ts          # Orchestration
  sourcing/
    evaluator.ts                  # Cold candidate evaluation
    message-generator.ts          # Sourcing outreach gen
    platform-detector.ts          # Detect platform from URL
    parsers/                      # Profile parsers per platform
      linkedin-parser.ts
      github-parser.ts
      dou-parser.ts
      djinni-parser.ts
      workua-parser.ts
  pdf/
    types.ts                      # ResumeData, PDFParseError types
    parser.ts                     # PDF text extraction (pdf-parse, legacy)
    extractor.ts                  # AI-powered structured data extraction (legacy)
    downloader.ts                 # Download PDF from Supabase Storage as base64
  translation.ts                  # i18n system
  language-utils.ts               # Language detection
  utils.ts                        # General utilities

supabase/migrations/              # SQL migration files (002-015)
public/bookmarklet/               # Bookmarklet source (vamos-quick-check.js)
scripts/start-bot.ts              # Telegram bot start script
middleware.ts                     # Auth middleware (protects /dashboard/*)
```

## Database Schema (Supabase/PostgreSQL)

### Core Tables

**managers** — User accounts
- id, email, password_hash (bcrypt, salt 10), name, role (admin|manager), is_active (BOOLEAN, default true), created_at
- is_active=false блокує вхід; не можна деактивувати себе через UI

**requests** — Hiring requests / job openings
- title, description, required_skills, nice_to_have_skills, soft_skills
- ai_orientation, red_flags, location, employment_type, remote_policy
- priority, status, qualification_questions
- test_task_url, test_task_deadline_days, test_task_message, test_task_evaluation_criteria
- job_description (AI-generated)
- outreach_template (TEXT), outreach_template_approved (BOOLEAN, default false)
- questionnaire_competency_ids (UUID[]), questionnaire_question_ids (UUID[]), questionnaire_custom_questions (JSONB)
- salary_range (TEXT, nullable) — зарплатна вилка (напр. "$1500–2500")
- **created_by** (UUID FK → managers, nullable, migration 016) — автор вакансії; існуючі записи = NULL → "Автор невідомий"
- **vacancy_info** (TEXT, nullable, migration 020) — специфічний контекст для кандидатів (онбординг, команда, графік тощо); використовується Telegram-ботом як пріоритетне джерело при відповіді на питання кандидата

**request_managers** — Менеджери вакансії many-to-many (migration 016)
- id, request_id (FK → requests), manager_id (FK → managers), added_at, added_by (FK → managers)
- UNIQUE(request_id, manager_id)
- Автор авто-додається при створенні вакансії
- Автора не можна видалити (перевірка в DELETE /api/requests/[id]/managers/[managerId])

**candidates** — Applicants (warm + cold)
- Contact: first_name, last_name, email, phone, telegram_username, telegram_chat_id (BIGINT), preferred_contact_methods
- Profile: about_text, why_vamos, key_skills, linkedin_url, portfolio_url, resume_url, resume_extracted_data (JSONB)
- AI analysis: ai_score (1-10), ai_category (top_tier|strong|potential|not_fit), ai_summary, ai_strengths, ai_concerns, ai_recommendation, ai_reasoning
- Sourcing: sourcing_method, profile_url, platform, current_position, location, experience_years, source (warm|cold)
- Multilingual: original_language, translated_to, about_text_translated, why_vamos_translated, key_skills_translated
- Outreach: outreach_status, outreach_sent_at, candidate_response, outreach_message
- Test task: test_task_status, test_task_sent_at, test_task_original_deadline, test_task_current_deadline, test_task_extensions_count, test_task_submitted_at, test_task_submission_text, test_task_candidate_feedback, test_task_ai_score, test_task_ai_evaluation, test_task_late_by_hours
- Questionnaire: questionnaire_status (sent|in_progress|completed|expired|skipped)
- Pipeline: pipeline_stage (new|analyzed|outreach_sent|questionnaire_sent|questionnaire_done|test_sent|test_done|interview|rejected|hired|outreach_declined) — **змінюється вручну** через PUT /api/candidates/[id]/pipeline-stage
- **Vacancy binding (migration 015):** primary_request_id (UUID FK → requests, nullable), applied_request_ids (UUID[]) — vacancies selected at application time
- **Blacklist (migration 019):** is_blacklisted (BOOLEAN, default false), blacklisted_at (TIMESTAMPTZ), blacklisted_by (UUID FK → managers), blacklist_reason (TEXT) — кандидат виключається з усіх автоматичних дій та вкладки "Рекомендовані"
- **Bot session (migration 021):** bot_session (JSONB, nullable) — стан анкети в Telegram боті: `{ state, questionnaire_response_id, current_question_index, current_answer_parts }`

**candidate_request_history** — Vacancy change log (migration 015)
- candidate_id, from_request_id, to_request_id, changed_by (manager FK), reason ('initial_application'|'manager_reassign'|'new_request_scan'|'auto_best_match'), notes, created_at

**candidate_request_matches** — Many-to-many candidates<->requests
- candidate_id, request_id, match_score (0-100), match_explanation
- status: new|reviewed|interview|hired|rejected|on_hold
- manager_notes
- outreach_telegram_message_id (BIGINT) — Telegram message ID for inline button editing
- final_decision (invite|reject), final_decision_at, final_decision_by (manager_id FK)

**comments** — Manager comments on candidates
- candidate_id, manager_id, text, created_at

**candidate_conversations** — Communication log
- candidate_id, direction (inbound|outbound), message_type (intro|test_task|follow_up|test_task_decision|…), content, metadata, sent_at

**outreach_queue** — Scheduled outreach
- candidate_id, request_id, intro_message, test_task_message
- delivery_method (email|telegram), scheduled_for, status, error_message, retry_count

**outreach_messages** — Sent message history
- candidate_id, request_id, message_type (intro|test_task|follow_up)
- content, delivery_method, sent_at, delivered_at, read_at, response, responded_at

**ai_analysis_queue** — Background AI processing queue
- candidate_id, status (pending|processing|completed|failed), error_message, retry_count

**automation_queue** — Pipeline automation job queue
- candidate_id, request_id, action_type (send_outreach|send_questionnaire|send_test_task|send_invite|send_rejection)
- status (pending|processing|completed|failed), scheduled_for (TIMESTAMPTZ), processed_at
- error_message, retry_count, metadata (JSONB)
- Indexes: status+scheduled_for, candidate_id+action_type (for duplicate detection)

**settings** — Key-value store for platform settings
- key (TEXT, PK), value (TEXT), updated_at (TIMESTAMPTZ)
- Initial key: `company_info` — company description used by Telegram bot for answering candidate questions

### Soft Skills Questionnaire Tables

**soft_skill_competencies** — Competency categories for questionnaire
- id, name, description, is_active, created_at, updated_at

**questionnaire_questions** — Questions linked to competencies
- id, competency_id (FK), text, is_universal, is_active, created_at, updated_at

**questionnaire_responses** — Candidate questionnaire answers + AI evaluation
- id, candidate_id (FK), request_id (FK), token (UUID, unique), status (sent|in_progress|completed|expired)
- questions (JSONB snapshot), answers (JSONB), ai_score (1-10), ai_evaluation (JSONB)
- sent_at, started_at, submitted_at, expires_at

## API Routes

### Candidates
- `POST /api/candidates/apply` — Submit application (public); accepts `applied_request_ids: UUID[]`
- `GET /api/candidates` — List (filters: category, source, score, search, sort, request_id for primary vacancy filter)
- `PUT /api/candidates/[id]/primary-request` — Change primary vacancy (records history)
- `GET /api/candidates/[id]/vacancy-matches` — All matched vacancies with scores
- `GET /api/candidates/[id]/request-history` — Vacancy change history
- `GET/PUT/DELETE /api/candidates/[id]` — CRUD
- `POST /api/candidates/[id]/analyze-background` — Background AI analysis (fire-and-forget from apply, triggers outreach)
- `POST /api/candidates/[id]/blacklist` — Add to blacklist (body: { reason? }); cancels pending automation_queue jobs
- `DELETE /api/candidates/[id]/blacklist` — Remove from blacklist
- `PUT /api/candidates/[id]/pipeline-stage` — Manually change pipeline stage (body: { stage, reason? }); logs to candidate_conversations; blocked if is_blacklisted=true
- `GET /api/candidates/[id]/resume` — PDF resume proxy/viewer
- `GET/POST /api/candidates/[id]/comments` — Comments
- `GET /api/candidates/inbox` — Inbox: кандидати що потребують уваги (4 категорії: new/analyzed/questionnaire/test)
- `GET /api/candidates/[id]/conversations` — Хронологія кандидата (candidate_conversations), `?sort=asc|desc`
- `GET /api/candidates/[id]/match-info` — Best match request_id + final_decision
- `POST /api/candidates/[id]/final-decision` — Manager invite/reject decision (queues automation)

### Managers
- `GET /api/managers` — List all managers (admin only); returns id, name, email, role, is_active, created_at (no password_hash)
- `POST /api/managers` — Create manager (admin only); hashes password with bcrypt; validates name/email/password(≥8)/role
- `PUT /api/managers/[id]` — Update manager (admin only); hashes password if provided; blocks self-deactivation and self-role-downgrade
- `GET /api/managers/search?q=` — Search active managers by name/email (≥2 chars, ILIKE); returns id, name, email

### Requests
- `GET /api/requests/open` — Public list of active vacancies (no auth) for Telegram Mini App apply form
- `GET /api/requests` — List all; includes created_by_manager, request_managers; supports `?filter=mine`
- `POST /api/requests` — Create; sets created_by from session, auto-adds creator to request_managers (**не тригерить auto scan-candidates**)
- `GET/PATCH/DELETE /api/requests/[id]` — CRUD; GET includes created_by_manager + request_managers with manager info
- `POST /api/requests/[id]/scan-candidates` — Scan candidate base for a vacancy (auth or internal secret; **тільки вручну**)
- `GET /api/requests/[id]/matches` — Matched candidates
- `GET /api/requests/[id]/recommended-candidates` — Кандидати з бази, які пройшли анкету по ≥3 компетенціях ≥7 балів, у стані rejected/outreach_declined, ще не в матчах цієї вакансії
- `POST /api/requests/[id]/add-recommended` — Додати вибраних рекомендованих кандидатів: створює matches + queues send_outreach + генерує AI re-outreach повідомлення
- `POST /api/requests/generate-job-description` — AI job description
- `POST /api/requests/[id]/managers` — Add manager to vacancy (body: { manager_id })
- `DELETE /api/requests/[id]/managers/[managerId]` — Remove manager (forbidden if managerId === created_by)

### AI
- `POST /api/ai/analyze` — Analyze candidate profile
- `POST /api/ai/match` — Calculate match score

### Sourcing
- `POST /api/sourcing/evaluate` — Evaluate cold candidate
- `POST /api/sourcing/parse-profile` — Parse profile data from URL
- `POST /api/sourcing/save-cold-candidate` — Save to DB

### Outreach
- `POST /api/outreach/schedule` — Schedule message
- `PUT /api/outreach/edit` — Edit scheduled
- `DELETE /api/outreach/cancel` — Cancel scheduled

### Test Tasks
- `POST /api/test-task/schedule` — Schedule test task
- `POST /api/test-task/submit` — Submit solution
- `POST /api/test-task/extend-deadline` — Request extension
- `POST /api/test-task/generate-message` — Generate message
- `POST /api/test-task/generate-decision-message` — AI-generate approval/rejection message for candidate
- `POST /api/test-task/decide` — Send decision (approved/rejected) + message to candidate via Telegram

### Questionnaire
- `GET/POST /api/questionnaire/competencies` — List (with questions) / Create competency (protected)
- `PUT/DELETE /api/questionnaire/competencies/[id]` — Update / Deactivate competency (protected)
- `POST /api/questionnaire/questions` — Create question (protected)
- `PUT/DELETE /api/questionnaire/questions/[id]` — Update / Delete question (protected)
- `POST /api/questionnaire/send` — Send questionnaire to candidate (protected)
- `GET /api/questionnaire/[token]` — Get questionnaire data (public, token-based)
- `POST /api/questionnaire/[token]/start` — Start questionnaire (public)
- `POST /api/questionnaire/[token]/submit` — Submit answers (public, triggers AI evaluation)
- `GET /api/questionnaire/response/[candidate_id]` — Get questionnaire results (protected)

### Telegram
- `POST /api/telegram/webhook` — Webhook handler (classifies responses, handles commands, processes outreach callback_query inline buttons)

### Cron (daily at 10:00 UTC, secured by CRON_SECRET)
- `GET /api/cron/process-automation` — Process automation_queue jobs (outreach, questionnaire, test task, invite, rejection)

### Legacy Cron (removed from vercel.json, routes still exist)
- `GET /api/cron/process-outreach` — Legacy manual outreach queue
- `GET /api/cron/process-ai-analysis` — Legacy AI analysis queue (replaced by fire-and-forget from apply)
- `GET /api/cron/process-test-tasks` — Legacy test task sending

### Settings
- `GET /api/settings?key=<key>` — Get setting by key (protected)
- `PUT /api/settings` — Upsert setting `{ key, value }` (protected)

### Other
- `GET /api/bookmarklet` — Generate bookmarklet code

## Key Business Logic

### User Management
Платформа є закритим інструментом для менеджерів Vamos. Публічна частина (лендінг, форма заявки) видалена — прийом заявок відбувається виключно через Telegram Mini App. Нових менеджерів адміністратор додає **вручну через Supabase Dashboard → Table Editor → таблиця managers**:
- name, email, password_hash (plain text, MVP), role (admin|manager), created_at (auto)

### AI Scoring System
- **1-3:** Not a fit (auto-reject)
- **4-6:** Potential (reserve)
- **7-8:** Strong match (invite to interview)
- **9-10:** Top tier (contact immediately)

### Candidate Sources
- **Warm:** Applied via web form or Telegram bot
- **Cold:** Sourced via bookmarklet from LinkedIn, GitHub, DOU, Djinni, Work.ua

### Automated Pipeline Flow
Весь флоу відбувається **одразу** (без черги для outreach/questionnaire/test_task):

1. **AI Analysis** (fire-and-forget з `/api/candidates/apply` → `analyze-background`): кандидат отримує `pipeline_stage: 'analyzed'`. **Auto-outreach вимкнено** — менеджер надсилає вручну.
2. **Підтвердження заявки**: якщо є `telegram_chat_id` — одразу надсилається повідомлення "Дякую, отримали заявку..."
3. **Manual outreach**: менеджер у дашборді натискає "Згенерувати повідомлення" → AI персоналізує → менеджер редагує/надсилає. Telegram-повідомлення містить кнопку **"Можемо починати 🚀"** → `pipeline_stage: 'outreach_sent'`
4. **Кандидат натискає "Можемо починати 🚀"** (callback `start_questionnaire:{candidateId}`): анкета починається **прямо в чаті бота** — питання одне за одним, кандидат відповідає текстом, натискає "Наступне" → `pipeline_stage: 'questionnaire_sent'`. **Примітка: callback містить лише candidateId (64-байт ліміт Telegram); requestId дістається з `primary_request_id` або best match при натисканні.**
5. **Завершення анкети**: AI-оцінка запускається одразу → `pipeline_stage: 'questionnaire_done'`. **Auto-тестове вимкнено** — менеджер надсилає вручну.
6. **Manual test task**: менеджер у дашборді (блок `TestTaskTimeline` → `SendTestTaskPanel`, з'являється коли `questionnaire_status === 'completed'`) натискає "Згенерувати повідомлення" → AI генерує (3-4 речення: подяка + сильні риси з анкети + посилання + дедлайн) → менеджер надсилає. Кандидат отримує дві кнопки: **"Надіслати результати 📎"** (Mini App `/submit-test?id=...`) і **"Відмовитися від виконання"** (callback `test_decline:{candidateId}`) → `pipeline_stage: 'test_sent'`
7. **Здача тестового**: кандидат натискає кнопку → відкривається Mini App `/submit-test` (налаштований як Telegram Mini App: `tg.ready()`, `tg.expand()`, `tg.close()` після сабміту). Якщо у вакансії заповнено `test_task_evaluation_criteria` — AI оцінює автоматично; якщо порожнє — лише ручна перевірка менеджером.
8. **Менеджер приймає рішення** (кнопки "Прийняти"/"Відмовити" у `DecisionPanel` з'являються при `submitted_on_time`/`submitted_late`/`evaluating`/`evaluated` — незалежно від AI-оцінки): AI генерує повідомлення → менеджер редагує/надсилає одразу.
   - **Прийняти**: кандидат отримує повідомлення + кнопки **"Прийняти запрошення ✅"** (`invite_accept:{candidateId}`) / **"Відхилити запрошення"** (`invite_decline:{candidateId}`)
   - **Відмовити**: кандидат отримує ввічливу відмову без кнопок

**Candidate invite response flow (Telegram):**
- `invite_accept` → "Дякуємо, зв'яжеться менеджер", `pipeline → interview`
- `invite_decline` → питання + кнопки `invite_decline_confirm` / `invite_decline_cancel`
  - `invite_decline_cancel` → повертаються кнопки invite_accept/invite_decline
  - `invite_decline_confirm` → бот просить написати причину, `pipeline → rejected`, `bot_session.state = 'waiting_invite_decline_reason'`; наступний текст від кандидата зберігається в `candidate_conversations`

**Test task decline flow (Telegram):**
- `test_decline` → питання + кнопки `test_decline_confirm` / `test_decline_cancel`
  - `test_decline_cancel` → повертаються кнопки здачі/відмови
  - `test_decline_confirm` → прощання, `pipeline → outreach_declined`

**Стан боту** зберігається в `candidates.bot_session` (JSONB):
```typescript
interface BotSession {
  state: 'idle' | 'questionnaire_in_progress' | 'waiting_invite_decline_reason';
  questionnaire_response_id?: string;
  current_question_index?: number;
  current_answer_parts?: string[]; // текстові фрагменти між кнопками
}
```

**Key files:**
- `lib/telegram/direct-actions.ts` — `sendOutreachDirectly()` (для re-outreach з рекомендованих)
- `lib/outreach/processor.ts` — `sendViaTelegram()` додає кнопку "Можемо починати 🚀" до всіх Telegram outreach
- `app/api/telegram/webhook/route.ts` — обробка всіх подій бота + логіка анкети в чаті
- `app/api/test-task/generate-invite-message/route.ts` — генерує повідомлення тестового (TEST_TASK_INVITE_PROMPT)
- `app/api/test-task/send/route.ts` — надсилає тестове з кнопками через Telegram (без parse_mode)
- `app/api/test-task/decide/route.ts` — надсилає рішення; для approved — з кнопками invite_accept/invite_decline (без parse_mode)
- `lib/automation/queue.ts` — Queue utilities (тільки для send_invite, send_rejection)
- `lib/automation/handlers.ts` — тільки `handleSendInvite`, `handleSendRejection` активні; решта — deprecated, skipped
- `lib/ai/prompts.ts` — OUTREACH_PERSONALIZATION_PROMPT
- `lib/ai/outreach-prompts.ts` — TEST_TASK_INVITE_PROMPT, TEST_TASK_APPROVAL_PROMPT, TEST_TASK_REJECTION_PROMPT
- `lib/outreach/message-generator.ts` — generatePersonalizedOutreach()
- `app/api/cron/process-automation/route.ts` — Cron job (тільки invite/rejection)
- `components/dashboard/test-task/TestTaskTimeline.tsx` — включає SendTestTaskPanel + DecisionPanel
- `components/dashboard/pipeline-timeline.tsx` — Visual pipeline progress

**Automation triggers:**
- `analyze-background` → **НЕ** надсилає outreach автоматично (вимкнено)
- Manual outreach (dashboard) → `processor.ts` → Telegram з кнопкою `start_questionnaire:{candidateId}`
- Telegram callback `start_questionnaire` → запуск анкети в боті
- Завершення анкети → AI eval → `pipeline_stage: 'questionnaire_done'` → менеджер вирішує про тестове
- Manager надсилає тестове → `POST /api/test-task/send` → Telegram з кнопками здачі/відмови
- Manager final decision → `POST /api/test-task/decide` → одразу надсилає повідомлення кандидату

**Blacklist guard:** `executeAutomationJob()` перевіряє `is_blacklisted` перед виконанням — якщо true, job завершується без відправки.

### Blacklist
- `is_blacklisted = true` — кандидат повністю виключається з автоматичного аутрічу та вкладки "Рекомендовані"
- При занесенні в чорний список: всі pending/processing jobs в automation_queue скасовуються
- `executeAutomationJob()` перевіряє `is_blacklisted` перед виконанням будь-якої дії
- Ручна зміна `pipeline_stage` заблокована якщо `is_blacklisted = true` (спочатку треба зняти)
- **UI:** кнопка "Чорний список" в хедері картки кандидата (`BlacklistButton.tsx`)
- **API:** `POST/DELETE /api/candidates/[id]/blacklist`

### Ручна зміна pipeline_stage
- Менеджер може змінити статус вручну через діалог у блоці Pipeline на картці кандидата
- Зміни логуються в `candidate_conversations` з `message_type: 'manual_stage_change'`
- **UI:** кнопка "Змінити статус" після PipelineTimeline (`PipelineStageEditor.tsx`)
- **API:** `PUT /api/candidates/[id]/pipeline-stage`

### Рекомендовані кандидати (вкладка на сторінці вакансії)
- Вкладка "Рекомендовані" на сторінці вакансії поруч з "Підібрані"
- Знаходить кандидатів зі статусами `rejected`/`outreach_declined`, які пройшли анкету по ≥3 компетенціях з поточної вакансії із оцінкою ≥7
- **Без AI** — підбір тільки по збережених оцінках анкети
- Менеджер вибирає кандидатів → натискає "Додати вибраних" → AI генерує персоналізований re-outreach (`RE_OUTREACH_PROMPT`) з контекстом сильних сторін
- Після підтвердження: `candidate_request_matches` (status: new) + automation_queue `send_outreach` + `pipeline_stage → outreach_sent`
- **Ключові файли:** `components/requests/RecommendedCandidates.tsx`, `app/api/requests/[id]/recommended-candidates/route.ts`, `app/api/requests/[id]/add-recommended/route.ts`, `lib/ai/outreach-prompts.ts` (`RE_OUTREACH_PROMPT`), `lib/outreach/message-generator.ts` (`generateReOutreach`)

### Auto scan-candidates при створенні вакансії
- **Видалено** — більше не тригериться автоматично при `POST /api/requests`
- Кнопка "Сканувати кандидатів" залишається, але запускається лише вручну менеджером

### Manual Outreach Flow (legacy)
1. Manager selects candidate + request
2. AI generates personalized intro message
3. Manager reviews/edits message
4. Message queued for delivery (email or Telegram)
5. Cron job sends in batches of 10/day
6. System tracks delivery, reads, responses

### Soft Skills Questionnaire Flow
1. Manager configures competencies + questions in admin panel (`/dashboard/settings/questionnaire`)
2. When creating a request, manager selects competencies in two modes: "all random" (system picks 3-4 at send time) or "specific questions" (exact question IDs). Custom questions added in the form are saved to the question bank.
3. **Automated (primary):** After candidate натискає "Можемо починати 🚀" — анкета проходить **прямо в Telegram боті** (питання одне за одним, відповіді — текстом). Стан зберігається в `candidates.bot_session`.
4. **Manual fallback:** On candidate page, manager clicks "Надіслати анкету" → system generates UUID token link → candidate fills web form
5. AI evaluates answers (score 1-10, per-competency breakdown, strengths, concerns)
6. Manager sees results on candidate detail page (QuestionnaireSection)

**Questionnaire statuses:** `null` (not sent) → `sent` / `in_progress` → `completed` / `expired`

**Key files:**
- `lib/ai/evaluateQuestionnaire.ts` — AI evaluation with inline prompt (not in prompts.ts)
- `app/api/telegram/webhook/route.ts` — bot questionnaire logic (startQuestionnaire, handleQuestionnaireNext, finalizeQuestionnaire)
- `components/dashboard/questionnaire/questionnaire-section.tsx` — Candidate detail integration
- `components/settings/questionnaire-settings.tsx` — Admin panel
- `app/questionnaire/[token]/questionnaire-form.tsx` — Public form (fallback)

### Test Task Flow
1. Manager schedules test task for candidate
2. System sends task via email/Telegram (or immediately when candidate responds positively in Telegram)
3. Candidate submits via `/submit-test` page or Telegram
4. AI evaluates submission (score 1-10 + detailed evaluation text)
5. Manager reviews AI evaluation in TestTaskTimeline (expandable submission text + AI score/feedback)
6. Manager clicks "Прийняти" or "Відхилити" → AI generates personalized message → manager reviews/edits → sends to candidate via Telegram
7. On approve: `candidate_request_matches.status` → `'interview'`; on reject: → `'rejected'`
8. Decision logged to `candidate_conversations` (message_type: `'test_task_decision'`)

**Test task statuses:** `not_sent` → `scheduled` → `sent` → `submitted_on_time`/`submitted_late` → `evaluating` → `evaluated` → `approved`/`rejected`

**Automated sending:** After questionnaire AI score ≥ 7, `sendTestTaskToCandidate()` sends the test task immediately with a Mini App button "Надіслати результат 📎" that opens `/submit-test`. Duplicate prevention: checks `test_task_status` before sending.

### Telegram Bot & Mini App
- `/start` — saves `telegram_chat_id` for existing candidate (by username), надсилає привітання з кнопкою Mini App `/apply`
- **Production:** webhook mode (`POST /api/telegram/webhook`). Set webhook via: `curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/webhook"`
- **Local dev:** polling mode (`npm run bot`). **Important:** polling and webhook are mutually exclusive — kill the polling process before using webhook, as Telegram automatically removes the webhook when polling is active
- Webhook handler uses `createServiceRoleClient()` to bypass RLS
- Stores `telegram_chat_id` on first contact (required for outbound messaging)
- **Webhook routing logic:**
  - `start_questionnaire:{candidateId}:{requestId}` callback → `startQuestionnaire()` — запуск анкети в боті
  - `questionnaire_next` callback → `handleQuestionnaireNext()` — збереження відповіді + наступне питання
  - Text while `bot_session.state === 'questionnaire_in_progress'` → акумулюється в `current_answer_parts` (не класифікується)
  - `questions_about_job` / `positive_with_questions` → `answerCandidateQuestion()` з контекстом вакансії
  - Legacy: `outreach_yes`/`outreach_no` callback → тепер запускає анкету або відмовляє (для старих повідомлень в льоту)
- **Question handling** (`positive_with_questions`, `questions_about_job`): AI generates answer using `answerCandidateQuestion()` — три шари контексту: 1) `vacancy_info`, 2) деталі вакансії, 3) `company_info` зі `settings`
- Logs all conversations to candidate_conversations table
- **Bot session** (`candidates.bot_session` JSONB): зберігає стан анкети між повідомленнями — `state`, `questionnaire_response_id`, `current_question_index`, `current_answer_parts`

### Telegram Mini App Integration
- Telegram Web App SDK loaded globally in `app/layout.tsx` (`telegram-web-app.js`)
- Detection: `window.Telegram.WebApp.initData` is non-empty **only** when opened from Telegram (SDK creates `window.Telegram.WebApp` on all pages, so checking just its existence is not enough)
- **Public layout** (`app/(public)/layout.tsx`): header and footer hidden when `isTelegram`
- **Apply form** (`app/(public)/apply/page.tsx`): "Як з вами зв'язатися?" block and telegram username field hidden; auto-sets `preferred_contact_methods: ['telegram']` and fills `telegram_username` from `initDataUnsafe.user.username`
- **Thank-you page** (`app/(public)/thank-you/page.tsx`): shows "Закрити та повернутися в Telegram" button (calls `WebApp.close()`) instead of "Повернутися на головну"
- Landing page CTA buttons link to `https://t.me/vamos_hiring_bot`
- TypeScript declarations for Telegram WebApp API: `lib/telegram/types.ts`

### Bookmarklet (Sourcing)
- Installed in browser, activated on candidate profile pages
- Scrapes profile data from supported platforms
- Sends data to `/api/sourcing/parse-profile` and `/api/sourcing/evaluate`
- Shows evaluation + generated outreach message in dashboard

## Authentication

- NextAuth.js with Credentials provider
- JWT session strategy
- Managers table in Supabase
- Middleware protects all `/dashboard/*` routes
- Passwords stored as **bcrypt hashes** (salt rounds: 10); compared via `bcrypt.compare()`
- Login blocked if `is_active = false`
- First admin created manually via Supabase Dashboard; all subsequent users via `/dashboard/settings/users` (admin only)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY         # Service role key (cron jobs, bypasses RLS)
ANTHROPIC_API_KEY                 # Claude API key
NEXTAUTH_URL                      # App URL (http://localhost:3000)
NEXTAUTH_SECRET                   # NextAuth secret
RESEND_API_KEY                    # Resend email API key
OUTREACH_FROM_EMAIL               # From address for outreach emails
CRON_SECRET                       # Cron job auth secret
TELEGRAM_BOT_TOKEN                # Telegram bot token
NEXT_PUBLIC_APP_URL               # Public app URL (bookmarklet, bot)
```

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production
npm run lint     # ESLint
npm run bot      # Start Telegram bot (polling mode, for local dev)

# One-time migration: hash existing plain-text passwords with bcrypt
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/hash-passwords.ts
```

## Supported Languages

Ukrainian (primary), English, Turkish, Spanish — detection via `lib/language-utils.ts`, translations via `lib/translation.ts`.

## Important Patterns

- **Supabase client:** Use `createServiceRoleClient()` from `lib/supabase/client.ts` in **all** API routes — the following tables have RLS enabled and are inaccessible via the anon client: `managers`, `settings`, `automation_queue`, `candidate_conversations`, `request_managers`. Using `createServerClient()` (anon key) for queries on these tables will silently return `null` or empty results instead of an error. `createServerClient()` is effectively unused in API routes — always use service role.
- **AI calls:** Text-only via `analyzeWithClaude()`, with PDF via `analyzeWithClaudeAndPDF()` in `lib/ai/claude.ts`. Prompts live in `lib/ai/prompts.ts`, outreach/decision prompts in `lib/ai/outreach-prompts.ts`.
- **DB types:** `lib/supabase/types.ts` defines all table types — update when schema changes. Use `as never` cast for Supabase insert/update objects when TypeScript complains about strict typing.
- **Migrations:** SQL files in `supabase/migrations/`, numbered sequentially (002-015).
- **Components:** shadcn/ui in `components/ui/`, feature components grouped by domain.
- **Vercel Hobby plan:** Cron jobs limited to once per day (`0 10 * * *`). Critical time-sensitive operations (like test task sending) should be handled immediately in webhook/API handlers, not via cron.

## PDF Resume Processing

### Flow
1. User uploads PDF via application form (filename sanitized — Cyrillic/spaces replaced with `_`)
2. File saved to Supabase Storage (`resumes` bucket, auto-created if missing)
3. `resume_url` saved to candidate record
4. During AI analysis, PDF is downloaded from Supabase Storage as base64
5. PDF sent **directly to Claude API** as a `document` content block (no text extraction needed)
6. Claude natively reads the PDF and uses all information (experience, skills, education) in analysis
7. Manager views PDF in candidate card via ResumeViewer component (iframe modal + download)

### Key Files
- `lib/pdf/downloader.ts` — `downloadResumePDFAsBase64()` — downloads PDF from Supabase Storage
- `lib/ai/claude.ts` — `analyzeWithClaudeAndPDF()` — sends prompt + PDF document to Claude API
- `components/candidates/ResumeViewer.tsx` — PDF viewer/download UI component (Dialog modal)
- `app/api/candidates/[id]/resume/route.ts` — Authenticated PDF proxy (service role, SDK download)
- `app/api/candidates/apply/route.ts` — Upload with filename sanitization + bucket auto-creation

### Legacy Files (not used for AI analysis)
- `lib/pdf/parser.ts` — PDF text extraction via pdf-parse (doesn't work on Vercel)
- `lib/pdf/extractor.ts` — AI-powered structured data extraction from text
- `lib/pdf/types.ts` — `ResumeData` interface, `PDFParseError` class

### AI Analysis with PDF
All three analysis endpoints send PDF directly to Claude:
- `POST /api/ai/analyze` — Manual analysis (button click)
- `POST /api/candidates/[id]/analyze-background` — Background analysis after creation
- `GET /api/cron/process-ai-analysis` — Cron job batch processing

### Database
- `candidates.resume_url` — Public URL of the PDF in Supabase Storage
- `candidates.resume_extracted_data` (JSONB) — Legacy field for text-based extraction (may be empty)
