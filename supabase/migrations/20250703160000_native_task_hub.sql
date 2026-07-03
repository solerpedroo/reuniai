-- Hub nativo de tarefas (substitui sync externo Todoist/Google Tasks)

create table public.user_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action_item_id uuid unique references public.action_items (id) on delete cascade,
  meeting_id uuid references public.meetings (id) on delete set null,
  title text not null,
  assignee text,
  due_date date,
  status public.action_item_status not null default 'open',
  source public.action_item_source not null default 'manual',
  priority public.action_item_priority not null default 'medium',
  snoozed_until timestamptz,
  hub_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_tasks_user_status_idx on public.user_tasks (user_id, status);
create index user_tasks_user_due_idx on public.user_tasks (user_id, due_date);
create index user_tasks_meeting_id_idx on public.user_tasks (meeting_id);
create index user_tasks_action_item_id_idx on public.user_tasks (action_item_id);

create trigger user_tasks_set_updated_at
  before update on public.user_tasks
  for each row execute function public.set_updated_at();

alter table public.user_tasks enable row level security;

create policy "user_tasks_select_own"
  on public.user_tasks for select to authenticated
  using (user_id = auth.uid());

create policy "user_tasks_insert_own"
  on public.user_tasks for insert to authenticated
  with check (user_id = auth.uid());

create policy "user_tasks_update_own"
  on public.user_tasks for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_tasks_delete_own"
  on public.user_tasks for delete to authenticated
  using (user_id = auth.uid());

-- Espelha action items existentes no hub
insert into public.user_tasks (
  user_id,
  action_item_id,
  meeting_id,
  title,
  assignee,
  due_date,
  status,
  source,
  priority,
  snoozed_until,
  hub_synced_at,
  created_at,
  updated_at
)
select
  user_id,
  id,
  meeting_id,
  title,
  assignee,
  due_date,
  status,
  source,
  priority,
  snoozed_until,
  now(),
  created_at,
  updated_at
from public.action_items
where status <> 'cancelled'
on conflict (action_item_id) do nothing;

comment on table public.user_tasks is
  'Hub unificado de tarefas do ReuniAI — espelha action_items e aceita tarefas avulsas.';
