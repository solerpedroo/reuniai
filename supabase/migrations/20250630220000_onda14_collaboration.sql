-- Onda 14: Colaboração e privacidade

alter table public.share_tokens
  add column if not exists redact_pii boolean not null default true;

-- ---------------------------------------------------------------------------
-- Audit log de exportações / compartilhamentos com redação
-- ---------------------------------------------------------------------------
create table if not exists public.export_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meeting_id uuid references public.meetings (id) on delete set null,
  share_token_id uuid references public.share_tokens (id) on delete set null,
  format text not null,
  redaction_count integer not null default 0,
  redaction_types jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists export_audit_user_id_idx on public.export_audit (user_id);
create index if not exists export_audit_meeting_id_idx on public.export_audit (meeting_id);

alter table public.export_audit enable row level security;

create policy "export_audit_select_own"
  on public.export_audit for select to authenticated
  using (user_id = auth.uid());

create policy "export_audit_insert_own"
  on public.export_audit for insert to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Comentários internos (anotações pessoais na timeline)
-- ---------------------------------------------------------------------------
create table if not exists public.meeting_comments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  start_ms integer not null check (start_ms >= 0),
  end_ms integer check (end_ms is null or end_ms >= start_ms),
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meeting_comments_meeting_id_idx on public.meeting_comments (meeting_id);

create trigger meeting_comments_set_updated_at
  before update on public.meeting_comments
  for each row execute function public.set_updated_at();

alter table public.meeting_comments enable row level security;

create policy "meeting_comments_select_own"
  on public.meeting_comments for select to authenticated
  using (user_id = auth.uid());

create policy "meeting_comments_insert_own"
  on public.meeting_comments for insert to authenticated
  with check (user_id = auth.uid());

create policy "meeting_comments_update_own"
  on public.meeting_comments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "meeting_comments_delete_own"
  on public.meeting_comments for delete to authenticated
  using (user_id = auth.uid());
