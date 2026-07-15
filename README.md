# ReuniAI

**Listen. Transcribe. Analyze. Action.**

Meeting intelligence platform for **Google Meet, Zoom, and Microsoft Teams**. A headless bot joins your calls, records, and transcribes audio in real-time, then leverages LLMs to extract executive summaries, decisions, action items, follow-ups, and key insights — making all meeting content searchable and actionable in a single workspace.

Built with Next.js 15, Supabase, Vexa, and LLM orchestration.

---

## Core Workflow

| Stage | Action |
|-------|--------|
| **Input** | Paste a calendar link (Meet/Zoom/Teams) or upload an existing audio/video recording. |
| **Bot Ingestion** | A headless bot joins the meeting with a customizable name and branded profile. |
| **Live Stream** | Real-time transcription, co-pilot assistance, decision logging, and participant analytics. |
| **Post-Call Pipeline** | Automatic pipeline: ingestion &rarr; transcription &rarr; semantic analysis &rarr; email alerts. |
| **Action Hub** | Interactive AI chat per meeting, tasks, follow-ups, secure sharing, and Notion exports. |

### Key Product Features

- **Ad-hoc Meetings** — Paste any valid link and send the bot immediately (`New Meeting`).
- **File Imports** — Upload audio or video files for asynchronous offline transcription.
- **Contextual AI Chat** — Chat with a specific meeting, query across multiple meetings, or simulate challenging conversations.
- **Workflow Automation** — Action item review queue, meeting briefs, automated follow-up emails, public summaries, and clips.
- **Privacy & Security** — Strict Row-Level Security (RLS) on Supabase, PII redaction for shared links, and customizable data retention.
- **Integrations** — Outbound Notion sync, webhooks; calendar sync and Slack digests fully implemented in the backend (UI toggles available).

---

## Architecture Flow

**Ad-hoc Flow (Primary):** `POST /api/meetings` &rarr; `startBotForMeeting` &rarr; Vexa webhook/polling &rarr; `finalizeStoppedMeeting` &rarr; LLM analysis &rarr; Notification.

**Scheduled Flow (Backend Ready):** Calendar sync cron &rarr; `schedule-bots` &rarr; bot join pipeline. Calendar dashboard is toggled off via UI feature flag until full OAuth configuration is completed.

---

## Technical Stack

| Layer | Technologies |
|--------|------------|
| **Frontend** | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion |
| **Backend** | Next.js Route Handlers, React Server Actions, Zod Validation |
| **Database & Auth** | Supabase (PostgreSQL + Row-Level Security + Storage Buckets) |
| **Bot & STT** | [Vexa API](https://vexa.ai) (Whisper-based Transcription) |
| **AI Layer** | Groq &middot; OpenAI &middot; Anthropic (Dynamic fallback routing based on availability) |
| **Vector Search** | OpenAI-compatible embeddings for RAG-powered cross-meeting query |
| **Notifications** | NodeMailer (SMTP) or Resend API |
| **Hosting** | Vercel + GitHub Actions (for scheduled crons) |

---

## Prerequisites

- **Node.js 20+**
- **Supabase Account** (Cloud project or local CLI development)
- **Vexa API Key** — [vexa.ai/account](https://vexa.ai/account)
- **LLM Provider Key** — Groq, OpenAI, or Anthropic (at least one configured)
- *(Optional)* Supabase CLI for database migration management

---

## Local Setup

```bash
git clone https://github.com/solerpedroo/reuniai.git
cd reuniai
npm install
cp .env.local.example .env.local
```

### Minimum Environment Variables

Edit `.env.local` with your local credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vexa Bot Configuration
VEXA_API_KEY=
VEXA_WEBHOOK_SECRET=

# LLM Providers (Configure at least one)
GROQ_API_KEY=
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=

# Scheduled Crons / Actions Secret
CRON_SECRET=

# Cryptographic Keys (For storing encrypted OAuth tokens)
ENCRYPTION_KEY=
```

Generate a secure 32-byte hex string for `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database Initialization

```bash
# Link to your Supabase cloud project
supabase link --project-ref <your-project-ref>
npm run db:push

# Or start a local Supabase stack
supabase start
npm run db:reset
```

Regenerate local database types after schema changes:

```bash
npm run gen:types
```

### Bot Branding (Optional)

```bash
npm run db:push      # Verifies the brand bucket in Supabase storage
npm run brand:upload # Uploads the bot avatar to a stable public URL
```

### Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register a new account, and use **New Meeting** to invite the bot to a Google Meet, Zoom, or Teams call.

---

## Environment Reference

Check [`.env.local.example`](.env.local.example) for a complete list of environment variables.

| Scope | Variables | Description |
|-------|-----------|-------------|
| **Core** | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` | Required for basic execution |
| **Bot Engine** | `VEXA_API_KEY`, `VEXA_WEBHOOK_SECRET`, `CRON_SECRET` | Required for recording live meetings |
| **AI Orchestrator** | `GROQ_API_KEY` / `OPENAI_API_KEY` / `LLM_PROVIDER` | Required for summaries, action items, and chat |
| **Embeddings** | `EMBEDDINGS_API_KEY` | Required for vector similarity search |
| **Email** | `GMAIL_*` or `RESEND_*` | Required for meeting digests and email updates |
| **Calendar Sync** | `GOOGLE_CALENDAR_*`, `MICROSOFT_*`, `ENCRYPTION_KEY` | Required for Google Calendar/Outlook sync (backend) |
| **Integrations** | `NOTION_*`, `SLACK_*` | Export to Notion and outbound Slack alerts |
| **Push Alerts** | `NEXT_PUBLIC_VAPID_*`, `VAPID_*` | Web Push notifications for browsers |

Register your production URL webhook with Vexa:

```bash
npm run vexa:webhook
```

---

## Deployment (Vercel)

1. Connect your repository to Vercel.
2. Populate the Environment Variables using the production keys.
3. Run `npm run db:push` to apply your PostgreSQL migrations to the production Supabase database.
4. Set up the following GitHub Secrets (`Settings → Secrets → Actions`):
   - `APP_URL` — Production deployment URL (without trailing slash).
   - `CRON_SECRET` — Matching the CRON_SECRET configured on Vercel.

### Cron Job Scheduling

| Source | Job Type | Schedule |
|--------|----------|----------|
| **Vercel** (`vercel.json`) | Data retention cleaner, weekly digests | Daily / Weekly |
| **GitHub Actions** (`.github/workflows/cron.yml`) | Calendar sync, bot polling, reminders | Every 5 minutes |

All `/api/cron/*` and `/api/webhooks/*` endpoints authenticate using a Bearer token verification (`Authorization: Bearer CRON_SECRET`).

---

## Directory Structure

```
app/
  (app)/          # Authenticated routes (meetings, home, tasks, settings)
  (auth)/         # Auth flows (login, signup)
  api/            # Route handlers (Vexa webhooks, bot management, cron endpoints)
  s/[token]       # Public, read-only shareable meetings
  c/[token]       # Public, shareable meeting clips

components/       # UI Components (dashboard, meeting details, settings)
lib/
  vexa/           # Vexa bot lifecycle handlers
  pipeline/       # Post-meeting ingestion + LLM pipeline
  meetings/       # CRUD operations, chat interface, export wrappers
  llm/            # Multi-provider client wrapper
  supabase/       # Client configurations, type definitions, auth middlewares
  ui/             # Feature flags and UI logic

supabase/migrations/   # Database schemas, constraints, and RLS rules
scripts/               # Seed scripts, RLS checks, avatar uploads
.github/workflows/     # CI workflows and periodic crons
middleware.ts          # Supabase session refresher
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Runs the local development server (Turbopack enabled) |
| `npm run build` | Builds the application for production deployment |
| `npm run start` | Starts the production Next.js server |
| `npm run lint` | Runs the static code analysis check (ESLint) |
| `npm run db:push` | Deploys schema migrations to your linked Supabase project |
| `npm run db:reset` | Wipes the database and recreates schemas locally |
| `npm run db:seed` | Populates the database with realistic seed data |
| `npm run gen:types` | Regenerates TS typings based on active Supabase schemas |
| `npm run brand:upload` | Uploads the branding avatar assets to Supabase Storage |
| `npm run vexa:webhook` | Submits your production webhook endpoint to Vexa |
| `npm run test:isolation` | Performs automated tests verifying RLS tenant isolation |

---

## Security & Privacy

- **PostgreSQL Row-Level Security (RLS):** Active on all user tables, ensuring strict data isolation.
- **Token Encryption:** Google Calendar and Microsoft Outlook OAuth access tokens are encrypted at rest using AES-256-GCM (`ENCRYPTION_KEY`).
- **Webhook Protection:** Incoming webhooks verify Vexa signatures and deduplicate events using `webhook_events`.
- **SSRF Prevention:** Local and loopback network interfaces are blocked from outbound webhook triggers.
- **Data Sharing:** Public share links use cryptographically secure tokens with voluntary PII scrubbing and automatic expiration rules.

---

## Feature Flags (UI)

Unfinished integrations can be easily toggled off in the frontend layout:

```typescript
// lib/ui/feature-visibility.ts
export const UI_FEATURE_VISIBILITY = {
  calendarIntegrations: false,  // Google Calendar + Outlook Sync
  slackIntegration: false,        // Slack Digests
} as const;
```

---

## Author

**Pedro Soler** — [GitHub](https://github.com/solerpedroo) &middot; [LinkedIn](https://www.linkedin.com/in/pedro-henrique-contardi-soler/)
