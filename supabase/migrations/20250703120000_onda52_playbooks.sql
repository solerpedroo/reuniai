-- Onda 52: Playbooks pós-reunião

create table if not exists public.playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  enabled boolean not null default true,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playbooks_user_id_idx on public.playbooks (user_id);

create trigger playbooks_set_updated_at
  before update on public.playbooks
  for each row execute function public.set_updated_at();

create table if not exists public.playbook_runs (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.playbooks (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  status text not null check (status in ('success', 'partial', 'failed')),
  log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists playbook_runs_meeting_id_idx on public.playbook_runs (meeting_id);
create index if not exists playbook_runs_playbook_id_idx on public.playbook_runs (playbook_id);

alter table public.playbooks enable row level security;
alter table public.playbook_runs enable row level security;

create policy "playbooks_select_own"
  on public.playbooks for select to authenticated
  using (user_id = auth.uid());

create policy "playbooks_insert_own"
  on public.playbooks for insert to authenticated
  with check (user_id = auth.uid());

create policy "playbooks_update_own"
  on public.playbooks for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "playbooks_delete_own"
  on public.playbooks for delete to authenticated
  using (user_id = auth.uid());

create policy "playbook_runs_select_own"
  on public.playbook_runs for select to authenticated
  using (
    exists (
      select 1 from public.playbooks p
      where p.id = playbook_id and p.user_id = auth.uid()
    )
  );
