# ReuniAI

SaaS de inteligência de reuniões — transcrição, resumo e action items com IA.

## Stack

- Next.js 15 (App Router)
- TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui (new-york, neutral)
- Supabase (Auth, DB, Storage)

## Pré-requisitos

- Node.js 20+
- npm

## Setup local

1. Clone o repositório e entre na pasta:

   ```bash
   cd reuniai
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Copie as variáveis de ambiente:

   ```bash
   cp .env.local.example .env.local
   ```

4. Preencha pelo menos as credenciais Supabase em `.env.local` (opcional para build; necessário para auth nas próximas ondas):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

5. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando        | Descrição              |
|----------------|------------------------|
| `npm run dev`  | Dev server (Turbopack) |
| `npm run build`| Build de produção      |
| `npm run start`| Servidor de produção   |
| `npm run lint` | ESLint                 |
| `npm run db:push` | Aplica migrations no projeto Supabase linkado |
| `npm run db:reset` | Reset local Supabase + migrations |
| `npm run gen:types` | Regenera `database.types.ts` do schema local |

## Supabase (Onda 2)

1. Instale a [Supabase CLI](https://supabase.com/docs/guides/cli) e faça login.
2. Crie um projeto em [supabase.com](https://supabase.com) ou use local:

   ```bash
   supabase link --project-ref <your-project-ref>
   npm run db:push
   ```

3. Ou rode localmente:

   ```bash
   supabase start
   npm run db:reset
   ```

4. Regenerar tipos após mudar o schema:

   ```bash
   npm run gen:types
   ```

Migrations em `supabase/migrations/`. Testes manuais de RLS: `supabase/tests/rls_isolation_notes.sql`.


```
app/              # App Router (flat, sem src/)
components/ui/    # shadcn/ui
lib/              # utils, Supabase clients
supabase/         # migrations (Onda 2)
middleware.ts     # refresh de sessão Supabase
```

## Documentação

Ver `implementation-plan.md` para o roadmap completo por ondas.
