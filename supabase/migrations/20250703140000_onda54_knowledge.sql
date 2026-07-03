-- Onda 54: base de conhecimento viva

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  slug text not null,
  summary text,
  body text not null default '',
  source_meeting_ids uuid[] not null default '{}'::uuid[],
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_entries_user_slug_unique unique (user_id, slug)
);

create index knowledge_entries_user_id_idx on public.knowledge_entries (user_id);
create index knowledge_entries_tags_gin on public.knowledge_entries using gin (tags);

create trigger knowledge_entries_set_updated_at
  before update on public.knowledge_entries
  for each row execute function public.set_updated_at();

alter table public.knowledge_entries enable row level security;

create policy "knowledge_entries_select_own"
  on public.knowledge_entries for select to authenticated
  using (user_id = auth.uid());

create policy "knowledge_entries_insert_own"
  on public.knowledge_entries for insert to authenticated
  with check (user_id = auth.uid());

create policy "knowledge_entries_update_own"
  on public.knowledge_entries for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "knowledge_entries_delete_own"
  on public.knowledge_entries for delete to authenticated
  using (user_id = auth.uid());
