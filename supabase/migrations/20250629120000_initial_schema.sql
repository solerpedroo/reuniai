-- ReuniAI initial schema: enums, tables, RLS, storage, triggers
-- Onda 2

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.meeting_platform as enum (
  'google_meet',
  'zoom',
  'teams',
  'other'
);

create type public.meeting_status as enum (
  'scheduled',
  'bot_joining',
  'recording',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'partial'
);

create type public.action_item_status as enum (
  'open',
  'done',
  'cancelled'
);

create type public.action_item_source as enum (
  'ai',
  'manual'
);

create type public.calendar_provider as enum (
  'google',
  'outlook'
);

create type public.chat_message_role as enum (
  'user',
  'assistant'
);

-- ---------------------------------------------------------------------------
-- Helper functions (no table dependencies)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  auto_join_enabled boolean not null default true,
  retention_days integer not null default 365
    constraint profiles_retention_days_positive check (retention_days > 0),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.calendar_provider not null,
  email text not null,
  refresh_token_encrypted text not null,
  sync_token text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_connections_user_provider_email_unique
    unique (user_id, provider, email)
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  calendar_event_id text,
  calendar_recurring_event_id text,
  title text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  platform public.meeting_platform not null default 'other',
  meeting_url text,
  status public.meeting_status not null default 'scheduled',
  recall_bot_id text,
  duration_ms integer
    constraint meetings_duration_ms_non_negative check (duration_ms is null or duration_ms >= 0),
  recording_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index meetings_user_calendar_event_unique
  on public.meetings (user_id, calendar_event_id)
  where calendar_event_id is not null;

create index meetings_user_started_at_idx
  on public.meetings (user_id, started_at desc);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

create index participants_meeting_id_idx on public.participants (meeting_id);

create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  start_ms integer not null
    constraint transcript_segments_start_ms_non_negative check (start_ms >= 0),
  end_ms integer not null
    constraint transcript_segments_end_ms_positive check (end_ms > start_ms),
  speaker_label text not null,
  text text not null,
  sequence integer not null
    constraint transcript_segments_sequence_non_negative check (sequence >= 0),
  created_at timestamptz not null default now()
);

create index transcript_segments_meeting_sequence_idx
  on public.transcript_segments (meeting_id, sequence);

create table public.meeting_summaries (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings (id) on delete cascade,
  executive_summary text,
  topics jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  assignee text,
  due_date date,
  status public.action_item_status not null default 'open',
  source public.action_item_source not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index action_items_meeting_id_idx on public.action_items (meeting_id);
create index action_items_user_status_idx on public.action_items (user_id, status);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.chat_message_role not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index chat_messages_meeting_created_idx
  on public.chat_messages (meeting_id, created_at);

create table public.transcript_embeddings (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.transcript_segments (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now()
);

create index transcript_embeddings_meeting_id_idx
  on public.transcript_embeddings (meeting_id);

create index transcript_embeddings_hnsw_idx
  on public.transcript_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Service-role only (no RLS policies for authenticated users)
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint webhook_events_provider_event_id_unique unique (provider, event_id)
);

-- ---------------------------------------------------------------------------
-- Helper functions (depend on tables above)
-- ---------------------------------------------------------------------------
create or replace function public.is_meeting_owner(meeting_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meetings m
    where m.id = meeting_uuid
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger calendar_connections_set_updated_at
  before update on public.calendar_connections
  for each row execute function public.set_updated_at();

create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

create trigger meeting_summaries_set_updated_at
  before update on public.meeting_summaries
  for each row execute function public.set_updated_at();

create trigger action_items_set_updated_at
  before update on public.action_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth trigger: profile on signup
-- ---------------------------------------------------------------------------
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.meetings enable row level security;
alter table public.participants enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.meeting_summaries enable row level security;
alter table public.action_items enable row level security;
alter table public.chat_messages enable row level security;
alter table public.transcript_embeddings enable row level security;
alter table public.webhook_events enable row level security;

-- profiles
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- calendar_connections
create policy "calendar_connections_select_own"
  on public.calendar_connections for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "calendar_connections_insert_own"
  on public.calendar_connections for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "calendar_connections_update_own"
  on public.calendar_connections for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "calendar_connections_delete_own"
  on public.calendar_connections for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- meetings
create policy "meetings_select_own"
  on public.meetings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "meetings_insert_own"
  on public.meetings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "meetings_update_own"
  on public.meetings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "meetings_delete_own"
  on public.meetings for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- participants (via meeting ownership)
create policy "participants_select_own_meetings"
  on public.participants for select
  to authenticated
  using (public.is_meeting_owner(meeting_id));

create policy "participants_insert_own_meetings"
  on public.participants for insert
  to authenticated
  with check (public.is_meeting_owner(meeting_id));

create policy "participants_update_own_meetings"
  on public.participants for update
  to authenticated
  using (public.is_meeting_owner(meeting_id))
  with check (public.is_meeting_owner(meeting_id));

create policy "participants_delete_own_meetings"
  on public.participants for delete
  to authenticated
  using (public.is_meeting_owner(meeting_id));

-- transcript_segments
create policy "transcript_segments_select_own_meetings"
  on public.transcript_segments for select
  to authenticated
  using (public.is_meeting_owner(meeting_id));

-- meeting_summaries
create policy "meeting_summaries_select_own_meetings"
  on public.meeting_summaries for select
  to authenticated
  using (public.is_meeting_owner(meeting_id));

-- action_items
create policy "action_items_select_own"
  on public.action_items for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "action_items_insert_own"
  on public.action_items for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_meeting_owner(meeting_id)
  );

create policy "action_items_update_own"
  on public.action_items for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "action_items_delete_own"
  on public.action_items for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- chat_messages
create policy "chat_messages_select_own"
  on public.chat_messages for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "chat_messages_insert_own"
  on public.chat_messages for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_meeting_owner(meeting_id)
  );

create policy "chat_messages_delete_own"
  on public.chat_messages for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- transcript_embeddings
create policy "transcript_embeddings_select_own_meetings"
  on public.transcript_embeddings for select
  to authenticated
  using (public.is_meeting_owner(meeting_id));

-- webhook_events: RLS enabled, no policies — only service_role bypasses

-- ---------------------------------------------------------------------------
-- Storage: private recordings bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('recordings', 'recordings', false, 524288000)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create policy "recordings_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "recordings_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "recordings_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "recordings_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
