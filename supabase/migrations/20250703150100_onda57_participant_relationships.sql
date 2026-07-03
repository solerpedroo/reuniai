-- Onda 57: CRM relacional por participante

create table public.participant_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  participant_key text not null,
  relationship_type text not null default 'colega',
  talking_points jsonb not null default '[]'::jsonb,
  open_loops jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participant_relationships_user_key_unique unique (user_id, participant_key)
);

create index participant_relationships_user_id_idx
  on public.participant_relationships (user_id);

create trigger participant_relationships_set_updated_at
  before update on public.participant_relationships
  for each row execute function public.set_updated_at();

alter table public.participant_relationships enable row level security;

create policy "participant_relationships_select_own"
  on public.participant_relationships for select to authenticated
  using (user_id = auth.uid());

create policy "participant_relationships_insert_own"
  on public.participant_relationships for insert to authenticated
  with check (user_id = auth.uid());

create policy "participant_relationships_update_own"
  on public.participant_relationships for update to authenticated
  using (user_id = auth.uid());

create policy "participant_relationships_delete_own"
  on public.participant_relationships for delete to authenticated
  using (user_id = auth.uid());
