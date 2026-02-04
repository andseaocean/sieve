# Vamos Hiring System (Сито)

AI-powered recruitment platform that automates candidate sourcing, screening, and matching. Enables managers to focus only on top-tier candidates while AI handles the pipeline.

## 🎯 Features

- **Public Application Form** — candidates apply with resume, bio, and answers to custom questions
- **AI-Powered Screening** — automatic candidate analysis and scoring (1-10 scale)
- **Smart Matching** — matches candidates to active hiring requests
- **Manager Dashboard** — create hiring requests, review candidates, manage pipeline
- **Quick Profile Check** — bookmarklet for sourcing candidates from LinkedIn, DOU, Djinni, Work.ua, GitHub
- **Multilingual** — supports Ukrainian and English

## 🏗️ Tech Stack

- **Frontend/Backend:** Next.js 14+ (App Router), TypeScript, React
- **Styling:** Tailwind CSS, shadcn/ui components
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude API (Sonnet 4.5)
- **Auth:** NextAuth.js
- **Hosting:** Vercel

## 📊 System Architecture

### Scoring System
- **1-3:** Not a fit (auto-reject)
- **4-6:** Potential (reserve)
- **7-8:** Strong match (invite to interview)
- **9-10:** Top tier (contact immediately)

### Candidate Flow
```
Application Form → AI Analysis → Matching → Manager Review → Interview
```

### Sourcing Methods
- **Warm Leads:** Public application form
- **Cold Leads:** Bookmarklet extraction from platforms
- **Auto-Search:** Automated platform scraping (future)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/vamos-hiring-system.git
cd vamos-hiring-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:
- Supabase URL and anon key
- Anthropic API key
- NextAuth secret (generate with `openssl rand -base64 32`)

4. Set up Supabase database:
- Run the SQL scripts from `/database` folder in your Supabase SQL editor
- Set up Row Level Security (RLS) policies

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Test Credentials
- Manager login: `manager@vamos.com` / `test123`

## 📁 Project Structure

```
├── app/
│   ├── (dashboard)/        # Manager-only pages
│   ├── (public)/           # Candidate-facing pages
│   ├── api/                # API routes
│   └── layout.tsx
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── [feature]/          # Feature-specific components
├── lib/
│   ├── ai/                 # Claude API integrations
│   ├── db/                 # Supabase queries
│   └── utils.ts
└── messages/               # i18n translations
    ├── en.json
    └── uk.json
```

## 🔐 Security

- Row Level Security (RLS) enabled on all Supabase tables
- NextAuth for authentication
- Environment variables for sensitive data
- GDPR-compliant candidate consent

## 📝 Environment Variables

Required variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `ANTHROPIC_API_KEY` — Claude API key
- `NEXTAUTH_URL` — Application URL (localhost or production)
- `NEXTAUTH_SECRET` — Random secret for NextAuth

## 🌍 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

Vercel will automatically deploy on every push to `main`.

## 📈 Roadmap

- [x] Phase 1: Manager Dashboard (Foundation)
- [x] Phase 2: Public Application Form
- [x] Phase 3: Hiring Requests Management
- [x] Phase 4: Candidates Management
- [x] Phase 5: AI Integration
- [x] Phase 6: Quick Profile Check (Bookmarklet)
- [ ] Phase 7: Auto Candidate Sourcing
- [ ] Phase 8: Email Notifications
- [ ] Phase 9: Analytics Dashboard
- [ ] Phase 10: Production Polish

## 🤝 Contributing

This is a private project for Vamos. For questions or suggestions, contact the team.

## 📄 License

Private - All Rights Reserved

---

**Built with ❤️ for Vamos team**
