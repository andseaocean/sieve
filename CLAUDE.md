# Sieve — AI-Powered Recruitment Platform

## Rules for Claude

- **Keep this file up to date.** After any structural changes to the project (new/removed files, tables, API routes, integrations, environment variables, dependencies, or significant business logic changes), update the relevant sections of this CLAUDE.md before finishing the task.
- Communicate with the user in the same language they use (default: Ukrainian).

## Project Overview

Sieve (package name: `hiring-system`) is an AI-powered recruitment platform for **Vamos** (AI-first tech company). It automates candidate screening, matching, and outreach. Primary UI language is Ukrainian.

**Candidate flow:** Application/Sourcing -> AI Analysis (1-10 score) -> Matching to requests -> Outreach -> **Soft Skills Questionnaire** -> Test Task -> Evaluation -> Interview

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
    settings/questionnaire/       # Soft Skills admin (competency/question bank)
  (public)/                       # Public pages
    page.tsx                      # Landing page
    apply/                        # Multi-step application form (4 steps)
    thank-you/                    # Success page
  submit-test/                    # Test task submission page
  questionnaire/[token]/          # Public questionnaire form (token-based access)
  api/                            # API routes (see below)

components/
  ui/                             # shadcn/ui primitives
  candidates/                     # CandidateCard, CandidateFilters, ResumeViewer, etc.
  dashboard/                      # Header, Sidebar
    test-task/                    # TestTaskTimeline (timeline, submission preview, decision panel)
    questionnaire/                # QuestionnaireSection (candidate detail integration)
  settings/                       # Admin settings components
    questionnaire-settings.tsx    # Competency/question bank management
    competency-card.tsx           # Competency card with questions list
    competency-dialog.tsx         # Create/edit competency dialog
    question-dialog.tsx           # Create/edit question dialog
  outreach/                       # Outreach management UI
  public/                         # Landing page components
  requests/                       # RequestForm, RequestDetail
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
  outreach/
    scheduler.ts                  # Schedule messages
    processor.ts                  # Process outreach queue
    email-service.ts              # Resend integration
    message-generator.ts          # AI message generation
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

supabase/migrations/              # SQL migration files (002-010)
public/bookmarklet/               # Bookmarklet source (vamos-quick-check.js)
scripts/start-bot.ts              # Telegram bot start script
middleware.ts                     # Auth middleware (protects /dashboard/*)
```

## Database Schema (Supabase/PostgreSQL)

### Core Tables

**managers** — User accounts
- id, email, password_hash, name, role (admin|manager), created_at

**requests** — Hiring requests / job openings
- title, description, required_skills, nice_to_have_skills, soft_skills
- ai_orientation, red_flags, location, employment_type, remote_policy
- priority, status, qualification_questions
- test_task_url, test_task_deadline_days, test_task_message, test_task_evaluation_criteria
- job_description (AI-generated)
- questionnaire_competency_ids (UUID[]), questionnaire_custom_questions (JSONB)

**candidates** — Applicants (warm + cold)
- Contact: first_name, last_name, email, phone, telegram_username, telegram_chat_id (BIGINT), preferred_contact_methods
- Profile: about_text, why_vamos, key_skills, linkedin_url, portfolio_url, resume_url, resume_extracted_data (JSONB)
- AI analysis: ai_score (1-10), ai_category (top_tier|strong|potential|not_fit), ai_summary, ai_strengths, ai_concerns, ai_recommendation, ai_reasoning
- Sourcing: sourcing_method, profile_url, platform, current_position, location, experience_years, source (warm|cold)
- Multilingual: original_language, translated_to, about_text_translated, why_vamos_translated, key_skills_translated
- Outreach: outreach_status, outreach_sent_at, candidate_response, outreach_message
- Test task: test_task_status, test_task_sent_at, test_task_original_deadline, test_task_current_deadline, test_task_extensions_count, test_task_submitted_at, test_task_submission_text, test_task_candidate_feedback, test_task_ai_score, test_task_ai_evaluation, test_task_late_by_hours
- Questionnaire: questionnaire_status (sent|in_progress|completed|expired|skipped)

**candidate_request_matches** — Many-to-many candidates<->requests
- candidate_id, request_id, match_score (0-100), match_explanation
- status: new|reviewed|interview|hired|rejected|on_hold
- manager_notes

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
- `POST /api/candidates/apply` — Submit application (public)
- `GET /api/candidates` — List (filters: category, source, score, search, sort)
- `GET/PUT/DELETE /api/candidates/[id]` — CRUD
- `POST /api/candidates/[id]/analyze-background` — Queue AI analysis
- `GET /api/candidates/[id]/resume` — PDF resume proxy/viewer
- `GET/POST /api/candidates/[id]/comments` — Comments

### Requests
- `GET/POST /api/requests` — List / Create
- `GET/PUT/DELETE /api/requests/[id]` — CRUD
- `GET /api/requests/[id]/matches` — Matched candidates
- `POST /api/requests/generate-job-description` — AI job description

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
- `POST /api/telegram/webhook` — Webhook handler (classifies responses, handles commands)

### Cron (daily at 10:00 UTC, secured by CRON_SECRET)
- `GET /api/cron/process-outreach` — Send scheduled outreach (batch of 10)
- `GET /api/cron/process-ai-analysis` — Process AI analysis queue
- `GET /api/cron/process-test-tasks` — Test task deadlines & reminders

### Other
- `GET /api/bookmarklet` — Generate bookmarklet code

## Key Business Logic

### AI Scoring System
- **1-3:** Not a fit (auto-reject)
- **4-6:** Potential (reserve)
- **7-8:** Strong match (invite to interview)
- **9-10:** Top tier (contact immediately)

### Candidate Sources
- **Warm:** Applied via web form or Telegram bot
- **Cold:** Sourced via bookmarklet from LinkedIn, GitHub, DOU, Djinni, Work.ua

### Outreach Flow
1. Manager selects candidate + request
2. AI generates personalized intro message
3. Manager reviews/edits message
4. Message queued for delivery (email or Telegram)
5. Cron job sends in batches of 10/day
6. System tracks delivery, reads, responses

### Soft Skills Questionnaire Flow
1. Manager configures competencies + questions in admin panel (`/dashboard/settings/questionnaire`)
2. When creating a request, manager selects which competencies to include (+ optional custom questions)
3. On candidate page, manager clicks "Надіслати анкету" → system generates UUID token link
4. Candidate opens link → welcome screen → fills out questions (min 50 chars each) → submits
5. AI evaluates answers (score 1-10, per-competency breakdown, strengths, concerns)
6. Manager sees results on candidate detail page (QuestionnaireSection)

**Questionnaire statuses:** `null` (not sent) → `sent` → `in_progress` → `completed` / `expired`

**Key files:**
- `lib/ai/evaluateQuestionnaire.ts` — AI evaluation with inline prompt (not in prompts.ts)
- `components/dashboard/questionnaire/questionnaire-section.tsx` — Candidate detail integration
- `components/settings/questionnaire-settings.tsx` — Admin panel
- `app/questionnaire/[token]/questionnaire-form.tsx` — Public form

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

**Immediate sending:** When a candidate replies positively in Telegram (classified as `positive`), the webhook handler sends the test task immediately via `sendTestTaskDirectly()` instead of going through the cron queue. Duplicate prevention: checks `test_task_status` before sending.

### Telegram Bot & Mini App
- `/start` — Sends welcome message with inline button that opens Mini App at `/apply`
- **Production:** webhook mode (`POST /api/telegram/webhook`). Set webhook via: `curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/webhook"`
- **Local dev:** polling mode (`npm run bot`). **Important:** polling and webhook are mutually exclusive — kill the polling process before using webhook, as Telegram automatically removes the webhook when polling is active
- Webhook handler uses `createServiceRoleClient()` to bypass RLS
- Stores `telegram_chat_id` on first message from candidate (required for outbound messaging)
- Incoming messages classified as: positive, negative, question, test_submission, deadline_request
- On `positive` response: sends test task immediately (bypasses cron queue)
- Auto-responds to questions using AI
- Logs all conversations to candidate_conversations table

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
- **Note:** Password comparison is MVP-level (plain comparison, not bcrypt)

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
```

## Supported Languages

Ukrainian (primary), English, Turkish, Spanish — detection via `lib/language-utils.ts`, translations via `lib/translation.ts`.

## Important Patterns

- **Supabase client:** Use `createClient()` from `lib/supabase/client.ts` for regular requests; use service role client (from `SUPABASE_SERVICE_ROLE_KEY`) in cron jobs and webhook handler to bypass RLS.
- **AI calls:** Text-only via `analyzeWithClaude()`, with PDF via `analyzeWithClaudeAndPDF()` in `lib/ai/claude.ts`. Prompts live in `lib/ai/prompts.ts`, outreach/decision prompts in `lib/ai/outreach-prompts.ts`.
- **DB types:** `lib/supabase/types.ts` defines all table types — update when schema changes. Use `as never` cast for Supabase insert/update objects when TypeScript complains about strict typing.
- **Migrations:** SQL files in `supabase/migrations/`, numbered sequentially (002-010).
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
