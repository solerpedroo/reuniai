-- Tier 7: Workflow Orchestration — tags, share links, follow-up, prep, notifications

create type public.share_scope as enum ('summary_only', 'full_transcript');

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  constraint tags_user_name_unique unique (user_id, name)
);

create table public.meeting_tags (
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meeting_id, tag_id)
);

create index meeting_tags_tag_id_idx on public.meeting_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Share links
-- ---------------------------------------------------------------------------
create table public.share_tokens (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  scope public.share_scope not null default 'summary_only',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index share_tokens_meeting_id_idx on public.share_tokens (meeting_id);
create index share_tokens_token_idx on public.share_tokens (token);

-- ---------------------------------------------------------------------------
-- Follow-up drafts
-- ---------------------------------------------------------------------------
create table public.meeting_follow_ups (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger meeting_follow_ups_set_updated_at
  before update on public.meeting_follow_ups
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Meeting prep cards
-- ---------------------------------------------------------------------------
create table public.meeting_prep_cards (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  briefing text not null,
  related_meeting_id uuid references public.meetings (id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_unique unique (user_id, endpoint)
);

-- ---------------------------------------------------------------------------
-- Profile extensions
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists notification_prefs jsonb not null default
    '{"email": false, "push": false, "prep": true, "completed": true}'::jsonb;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tags enable row level security;
alter table public.meeting_tags enable row level security;
alter table public.share_tokens enable row level security;
alter table public.meeting_follow_ups enable row level security;
alter table public.meeting_prep_cards enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "tags_select_own"
  on public.tags for select to authenticated
  using (user_id = (select auth.uid()));

create policy "tags_insert_own"
  on public.tags for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "tags_update_own"
  on public.tags for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tags_delete_own"
  on public.tags for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "meeting_tags_select_own"
  on public.meeting_tags for select to authenticated
  using (public.is_meeting_owner(meeting_id));

create policy "meeting_tags_insert_own"
  on public.meeting_tags for insert to authenticated
  with check (public.is_meeting_owner(meeting_id));

create policy "meeting_tags_delete_own"
  on public.meeting_tags for delete to authenticated
  using (public.is_meeting_owner(meeting_id));

create policy "share_tokens_select_own"
  on public.share_tokens for select to authenticated
  using (user_id = (select auth.uid()));

create policy "share_tokens_insert_own"
  on public.share_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "share_tokens_update_own"
  on public.share_tokens for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "share_tokens_delete_own"
  on public.share_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "meeting_follow_ups_select_own"
  on public.meeting_follow_ups for select to authenticated
  using (user_id = (select auth.uid()));

create policy "meeting_follow_ups_insert_own"
  on public.meeting_follow_ups for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "meeting_follow_ups_update_own"
  on public.meeting_follow_ups for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "meeting_follow_ups_delete_own"
  on public.meeting_follow_ups for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "meeting_prep_cards_select_own"
  on public.meeting_prep_cards for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
