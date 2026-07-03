-- Onda 53: sync bidirecional de tarefas (Todoist / Google Tasks)

create type public.task_sync_provider as enum ('todoist', 'google_tasks');

create table public.task_sync_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.task_sync_provider not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  external_account_label text,
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_sync_connections_user_provider_unique unique (user_id, provider)
);

create index task_sync_connections_user_id_idx on public.task_sync_connections (user_id);

create trigger task_sync_connections_set_updated_at
  before update on public.task_sync_connections
  for each row execute function public.set_updated_at();

alter table public.task_sync_connections enable row level security;

create policy "task_sync_connections_select_own"
  on public.task_sync_connections for select to authenticated
  using (user_id = auth.uid());

create policy "task_sync_connections_delete_own"
  on public.task_sync_connections for delete to authenticated
  using (user_id = auth.uid());

create table public.task_sync_links (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid not null references public.action_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.task_sync_provider not null,
  external_id text not null,
  last_pushed_at timestamptz,
  last_pulled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint task_sync_links_item_provider_unique unique (action_item_id, provider)
);

create index task_sync_links_user_id_idx on public.task_sync_links (user_id);
create index task_sync_links_action_item_id_idx on public.task_sync_links (action_item_id);

alter table public.task_sync_links enable row level security;

create policy "task_sync_links_select_own"
  on public.task_sync_links for select to authenticated
  using (user_id = auth.uid());
