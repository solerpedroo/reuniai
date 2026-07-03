-- Onda 69: clips de momento compartilháveis

create table public.meeting_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  highlight_id uuid references public.meeting_highlights (id) on delete set null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  caption text not null,
  start_ms integer not null,
  end_ms integer,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  redact_pii boolean not null default true,
  created_at timestamptz not null default now()
);

create index meeting_clips_user_id_idx on public.meeting_clips (user_id);
create index meeting_clips_meeting_id_idx on public.meeting_clips (meeting_id);
create index meeting_clips_token_idx on public.meeting_clips (token);

alter table public.meeting_clips enable row level security;

create policy meeting_clips_select on public.meeting_clips
  for select using (user_id = auth.uid());

create policy meeting_clips_insert on public.meeting_clips
  for insert with check (user_id = auth.uid());

create policy meeting_clips_update on public.meeting_clips
  for update using (user_id = auth.uid());
