-- Onda 17: Integrações e automações (Slack, Notion, webhooks outbound)

-- ---------------------------------------------------------------------------
-- Slack workspace connection
-- ---------------------------------------------------------------------------
create table if not exists public.slack_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id text not null,
  team_name text,
  channel_id text,
  channel_name text,
  bot_token_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slack_connections_user_id_unique unique (user_id)
);

create trigger slack_connections_set_updated_at
  before update on public.slack_connections
  for each row execute function public.set_updated_at();

alter table public.slack_connections enable row level security;

create policy "slack_connections_select_own"
  on public.slack_connections for select to authenticated
  using (user_id = auth.uid());

create policy "slack_connections_update_own"
  on public.slack_connections for update to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Notion workspace connection
-- ---------------------------------------------------------------------------
create table if not exists public.notion_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id text not null,
  workspace_name text,
  access_token_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notion_connections_user_id_unique unique (user_id)
);

create trigger notion_connections_set_updated_at
  before update on public.notion_connections
  for each row execute function public.set_updated_at();

alter table public.notion_connections enable row level security;

create policy "notion_connections_select_own"
  on public.notion_connections for select to authenticated
  using (user_id = auth.uid());

create policy "notion_connections_delete_own"
  on public.notion_connections for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Outbound webhooks (user-registered)
-- ---------------------------------------------------------------------------
create table if not exists public.outbound_webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  secret text not null,
  events text[] not null default '{}',
  description text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outbound_webhooks_user_id_idx on public.outbound_webhooks (user_id);

create trigger outbound_webhooks_set_updated_at
  before update on public.outbound_webhooks
  for each row execute function public.set_updated_at();

alter table public.outbound_webhooks enable row level security;

create policy "outbound_webhooks_select_own"
  on public.outbound_webhooks for select to authenticated
  using (user_id = auth.uid());

create policy "outbound_webhooks_insert_own"
  on public.outbound_webhooks for insert to authenticated
  with check (user_id = auth.uid());

create policy "outbound_webhooks_update_own"
  on public.outbound_webhooks for update to authenticated
  using (user_id = auth.uid());

create policy "outbound_webhooks_delete_own"
  on public.outbound_webhooks for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Webhook delivery log
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.outbound_webhooks (id) on delete cascade,
  event text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists webhook_deliveries_webhook_id_idx on public.webhook_deliveries (webhook_id);

alter table public.webhook_deliveries enable row level security;

create policy "webhook_deliveries_select_own"
  on public.webhook_deliveries for select to authenticated
  using (
    webhook_id in (
      select id from public.outbound_webhooks where user_id = auth.uid()
    )
  );
