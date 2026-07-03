-- Onda 62: atas formais de reunião

create table public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content_md text not null,
  content_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meeting_minutes_user_id_idx on public.meeting_minutes (user_id);

create trigger meeting_minutes_set_updated_at
  before update on public.meeting_minutes
  for each row execute function public.set_updated_at();

alter table public.meeting_minutes enable row level security;

create policy meeting_minutes_select on public.meeting_minutes
  for select using (user_id = auth.uid());

create policy meeting_minutes_insert on public.meeting_minutes
  for insert with check (user_id = auth.uid());

create policy meeting_minutes_update on public.meeting_minutes
  for update using (user_id = auth.uid());

create policy meeting_minutes_delete on public.meeting_minutes
  for delete using (user_id = auth.uid());
