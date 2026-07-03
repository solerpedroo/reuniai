-- Onda 59: coach de reunião (score + sugestões pós-call)

create table public.meeting_coach_reports (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score int not null check (score >= 0 and score <= 100),
  metrics jsonb not null default '{}'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_coach_reports_meeting_unique unique (meeting_id)
);

create index meeting_coach_reports_user_id_idx
  on public.meeting_coach_reports (user_id);

create trigger meeting_coach_reports_set_updated_at
  before update on public.meeting_coach_reports
  for each row execute function public.set_updated_at();

alter table public.meeting_coach_reports enable row level security;

create policy "meeting_coach_reports_select_own"
  on public.meeting_coach_reports for select to authenticated
  using (user_id = auth.uid());

create policy "meeting_coach_reports_insert_own"
  on public.meeting_coach_reports for insert to authenticated
  with check (user_id = auth.uid() and public.is_meeting_owner(meeting_id));

create policy "meeting_coach_reports_update_own"
  on public.meeting_coach_reports for update to authenticated
  using (user_id = auth.uid());

create policy "meeting_coach_reports_delete_own"
  on public.meeting_coach_reports for delete to authenticated
  using (user_id = auth.uid());
