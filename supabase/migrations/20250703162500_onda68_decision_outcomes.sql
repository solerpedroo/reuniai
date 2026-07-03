-- Onda 68: rastreamento de cumprimento de decisões

create type public.decision_outcome_status as enum (
  'pending',
  'in_progress',
  'done',
  'reversed'
);

create table public.decision_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  decision_key text not null,
  decision_text text not null,
  status public.decision_outcome_status not null default 'pending',
  first_meeting_id uuid references public.meetings (id) on delete set null,
  last_meeting_id uuid references public.meetings (id) on delete set null,
  suggested_status public.decision_outcome_status,
  suggested_at timestamptz,
  suggested_meeting_id uuid references public.meetings (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, decision_key)
);

create index decision_outcomes_user_id_idx on public.decision_outcomes (user_id);
create index decision_outcomes_status_idx on public.decision_outcomes (user_id, status);

create table public.decision_outcome_events (
  id uuid primary key default gen_random_uuid(),
  outcome_id uuid not null references public.decision_outcomes (id) on delete cascade,
  meeting_id uuid references public.meetings (id) on delete set null,
  event_type text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index decision_outcome_events_outcome_id_idx on public.decision_outcome_events (outcome_id);

create trigger decision_outcomes_set_updated_at
  before update on public.decision_outcomes
  for each row execute function public.set_updated_at();

alter table public.decision_outcomes enable row level security;
alter table public.decision_outcome_events enable row level security;

create policy decision_outcomes_select on public.decision_outcomes
  for select using (user_id = auth.uid());

create policy decision_outcomes_insert on public.decision_outcomes
  for insert with check (user_id = auth.uid());

create policy decision_outcomes_update on public.decision_outcomes
  for update using (user_id = auth.uid());

create policy decision_outcome_events_select on public.decision_outcome_events
  for select using (
    exists (
      select 1 from public.decision_outcomes o
      where o.id = outcome_id and o.user_id = auth.uid()
    )
  );

create policy decision_outcome_events_insert on public.decision_outcome_events
  for insert with check (
    exists (
      select 1 from public.decision_outcomes o
      where o.id = outcome_id and o.user_id = auth.uid()
    )
  );
