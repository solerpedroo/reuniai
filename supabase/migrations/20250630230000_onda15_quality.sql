-- Onda 15: Qualidade da reunião e personalização

alter table public.meetings
  add column if not exists analysis_template text;

alter table public.profiles
  add column if not exists locale text not null default 'pt-BR',
  add column if not exists default_analysis_template text not null default 'generic';

-- ---------------------------------------------------------------------------
-- Highlights (bookmarks na timeline)
-- ---------------------------------------------------------------------------
create table if not exists public.meeting_highlights (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  start_ms integer not null check (start_ms >= 0),
  end_ms integer check (end_ms is null or end_ms >= start_ms),
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meeting_highlights_meeting_id_idx on public.meeting_highlights (meeting_id);

create trigger meeting_highlights_set_updated_at
  before update on public.meeting_highlights
  for each row execute function public.set_updated_at();

alter table public.meeting_highlights enable row level security;

create policy "meeting_highlights_select_own"
  on public.meeting_highlights for select to authenticated
  using (user_id = auth.uid());

create policy "meeting_highlights_insert_own"
  on public.meeting_highlights for insert to authenticated
  with check (user_id = auth.uid());

create policy "meeting_highlights_update_own"
  on public.meeting_highlights for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "meeting_highlights_delete_own"
  on public.meeting_highlights for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Mapeamento persistente de speakers
-- ---------------------------------------------------------------------------
create table if not exists public.speaker_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label_pattern text not null,
  participant_email text,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaker_mappings_user_label_unique unique (user_id, label_pattern)
);

create index if not exists speaker_mappings_user_id_idx on public.speaker_mappings (user_id);

create trigger speaker_mappings_set_updated_at
  before update on public.speaker_mappings
  for each row execute function public.set_updated_at();

alter table public.speaker_mappings enable row level security;

create policy "speaker_mappings_select_own"
  on public.speaker_mappings for select to authenticated
  using (user_id = auth.uid());

create policy "speaker_mappings_insert_own"
  on public.speaker_mappings for insert to authenticated
  with check (user_id = auth.uid());

create policy "speaker_mappings_update_own"
  on public.speaker_mappings for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "speaker_mappings_delete_own"
  on public.speaker_mappings for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Template default por série recorrente
-- ---------------------------------------------------------------------------
create table if not exists public.series_analysis_defaults (
  user_id uuid not null references auth.users (id) on delete cascade,
  calendar_recurring_event_id text not null,
  analysis_template text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, calendar_recurring_event_id)
);

create trigger series_analysis_defaults_set_updated_at
  before update on public.series_analysis_defaults
  for each row execute function public.set_updated_at();

alter table public.series_analysis_defaults enable row level security;

create policy "series_analysis_defaults_select_own"
  on public.series_analysis_defaults for select to authenticated
  using (user_id = auth.uid());

create policy "series_analysis_defaults_insert_own"
  on public.series_analysis_defaults for insert to authenticated
  with check (user_id = auth.uid());

create policy "series_analysis_defaults_update_own"
  on public.series_analysis_defaults for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "series_analysis_defaults_delete_own"
  on public.series_analysis_defaults for delete to authenticated
  using (user_id = auth.uid());
