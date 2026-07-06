# ReuniAI

**Ouve. Transcreve. Analisa. Potencializa.**

SaaS de inteligência de reuniões para **Google Meet, Zoom e Microsoft Teams**. Um bot entra na call, grava e transcreve em tempo real; depois a IA extrai resumo executivo, decisões, action items, follow-ups e insights — tudo pesquisável e acionável num único lugar.

Projeto pessoal full-stack: Next.js 15, Supabase, Vexa e LLMs.

---

## O que o ReuniAI faz

| Etapa | O que acontece |
|-------|----------------|
| **Entrada** | Você cola o link da reunião ou importa uma gravação |
| **Bot** | O ReuniAI entra na call com nome personalizado e câmera de marca |
| **Ao vivo** | Transcrição em tempo real, copilot, captura de decisões e contagem de participantes |
| **Pós-call** | Pipeline automático: ingestão → resumo → action items → embeddings → notificações |
| **Ação** | Chat sobre a reunião, tarefas, follow-ups, compartilhamento, export PDF/Notion |

### Destaques

- **Reunião espontânea** — cole o link e o bot entra na hora (`Nova reunião`)
- **Importação** — upload de áudio/vídeo para transcrição offline
- **IA contextual** — chat por reunião, assistente cross-meeting e ensaio de conversas difíceis
- **Workflow completo** — fila de revisão, prep, follow-ups, atas, clips e links públicos
- **Privacidade** — RLS no Supabase, redaction de PII em compartilhamentos, retenção configurável
- **Integrações** — Notion (export), webhooks outbound; calendário e Slack implementados no backend (UI temporariamente oculta)

---

## Como funciona

**Fluxo ad-hoc (principal hoje):** `POST /api/meetings` → `startBotForMeeting` → webhook/poll Vexa → `finalizeStoppedMeeting` → análise LLM.

**Fluxo agendado (backend pronto):** sync de calendário → cron `schedule-bots` → mesmo pipeline. UI de calendário desabilitada via feature flag até configuração OAuth completa.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui, Motion |
| Backend | Route Handlers, Server Actions, Zod |
| Banco & Auth | Supabase (Postgres + RLS + Storage) |
| Bot & STT | [Vexa](https://vexa.ai) (Whisper) |
| IA | Groq / OpenAI / Anthropic (fallback automático por env) |
| Embeddings | OpenAI-compatible (RAG opcional) |
| Email | Gmail SMTP ou Resend |
| Deploy | Vercel + GitHub Actions (crons) |

---

## Pré-requisitos

- **Node.js 20+**
- **Conta Supabase** (projeto cloud ou CLI local)
- **Chave Vexa** — [vexa.ai/account](https://vexa.ai/account)
- **Chave LLM** — Groq, OpenAI ou Anthropic (pelo menos uma)
- *(Opcional)* Supabase CLI para migrations locais

---

## Setup local

```bash
git clone https://github.com/solerpedroo/reuniai.git
cd reuniai
npm install
cp .env.local.example .env.local
```

### Variáveis mínimas para rodar

Edite `.env.local` com:

```env
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Bot de reunião (obrigatório para gravar calls)
VEXA_API_KEY=
VEXA_WEBHOOK_SECRET=

# IA (pelo menos uma)
GROQ_API_KEY=
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=

# Crons locais / GitHub Actions
CRON_SECRET=

# Tokens OAuth criptografados (calendário, integrações)
ENCRYPTION_KEY=
```

Gere `ENCRYPTION_KEY` (32 bytes em hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Banco de dados

```bash
# Projeto cloud
supabase link --project-ref <seu-project-ref>
npm run db:push

# Ou local
supabase start
npm run db:reset
```

Regenerar tipos após mudar o schema:

```bash
npm run gen:types
```

### Branding do bot (opcional)

```bash
npm run db:push      # bucket brand no Storage
npm run brand:upload # envia avatar para URL pública estável
```

### Subir o app

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), crie uma conta e use **Nova reunião** para colar um link do Meet/Zoom/Teams.

---

## Variáveis de ambiente

Referência completa em [`.env.local.example`](.env.local.example).

| Grupo | Variáveis | Quando precisa |
|-------|-----------|----------------|
| **Core** | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` | Sempre |
| **Bot** | `VEXA_API_KEY`, `VEXA_WEBHOOK_SECRET`, `CRON_SECRET` | Gravar reuniões |
| **IA** | `GROQ_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, `LLM_PROVIDER` | Resumos e chat |
| **Embeddings** | `EMBEDDINGS_API_KEY` | Busca semântica (opcional) |
| **Email** | `GMAIL_*` ou `RESEND_*` | Notificações e digest |
| **Calendário** | `GOOGLE_CALENDAR_*`, `MICROSOFT_*`, `ENCRYPTION_KEY` | Sync Google/Outlook *(backend)* |
| **Integrações** | `NOTION_*`, `SLACK_*` | Export Notion / digest Slack |
| **Push** | `NEXT_PUBLIC_VAPID_*`, `VAPID_*` | Web Push no browser |

Configure o webhook Vexa apontando para produção:

```bash
npm run vexa:webhook
```

---

## Deploy (Vercel)

1. Importe o repo na Vercel
2. Configure todas as env vars do `.env.local.example`
3. `npm run db:push` no Supabase de produção
4. Defina secrets no GitHub (`Settings → Secrets → Actions`):
   - `APP_URL` — URL de produção (sem barra final)
   - `CRON_SECRET` — mesmo valor da env na Vercel

### Crons

| Origem | Jobs |
|--------|------|
| **Vercel** (`vercel.json`) | Retention diário, digest semanal (email) |
| **GitHub Actions** (`.github/workflows/cron.yml`) | Sync calendário, schedule/poll bots, prep, lembretes — a cada 5 min |

Os endpoints `/api/cron/*` e `/api/webhooks/*` autenticam com `Authorization: Bearer CRON_SECRET` ou segredo do provedor.

---

## Estrutura do projeto

```
app/
  (app)/          # Páginas autenticadas (reuniões, hoje, tarefas, …)
  (auth)/         # Login e signup
  api/            # Route handlers (bot, meetings, cron, webhooks, …)
  s/[token]       # Compartilhamento público read-only
  c/[token]       # Clips públicos

components/       # UI (meetings, dashboard, shell, settings, …)
lib/
  vexa/           # Bot lifecycle (scheduler, poll, finalize)
  pipeline/       # Ingestão + análise LLM pós-reunião
  meetings/       # CRUD, chat, export, live session
  llm/            # Cliente multi-provedor
  supabase/       # Clients, types, middleware auth
  ui/             # Feature flags de visibilidade

supabase/migrations/   # Schema Postgres + RLS
scripts/               # Seed, RLS test, brand upload, webhook Vexa
.github/workflows/     # Crons (Hobby Vercel workaround)
middleware.ts          # Refresh de sessão Supabase
```

---

## Scripts npm

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica migrations no Supabase linkado |
| `npm run db:reset` | Reset local + migrations |
| `npm run db:seed` | Seed de reuniões de exemplo |
| `npm run gen:types` | Regenera `database.types.ts` |
| `npm run brand:upload` | Upload do avatar do bot no Storage |
| `npm run vexa:webhook` | Registra webhook Vexa na URL de produção |
| `npm run test:isolation` | Testa isolamento RLS entre usuários |

---

## Segurança

- **RLS** em todas as tabelas de usuário — cada conta só vê seus dados
- **Tokens OAuth** criptografados com AES-256-GCM (`ENCRYPTION_KEY`)
- **Webhooks** validados por Bearer secret + dedupe em `webhook_events`
- **Rate limiting** in-memory nas rotas de bot, chat, busca e export
- **SSRF** bloqueado em webhooks outbound (URLs privadas rejeitadas)
- **Compartilhamento** via tokens com expiração, revogação e redaction opcional de PII

Testes manuais de RLS: `supabase/tests/rls_isolation_notes.sql` e `npm run test:isolation`.

---

## Feature flags (UI)

Integrações em desenvolvimento podem ser ocultadas sem remover o backend:

```typescript
// lib/ui/feature-visibility.ts
export const UI_FEATURE_VISIBILITY = {
  calendarIntegrations: false,  // Google Calendar + Outlook
  slackIntegration: false,        // Digest Slack
} as const;
```

Altere para `true` quando OAuth e credenciais estiverem configurados.

---

## Autor

**Pedro** — projeto pessoal construído para demonstrar arquitetura SaaS real: bot de reunião, pipeline de IA, RLS, crons e integrações — do link colado ao follow-up enviado.

---

<p align="center">
  <strong>ReuniAI</strong> — transforme reuniões em memória organizada.
</p>
