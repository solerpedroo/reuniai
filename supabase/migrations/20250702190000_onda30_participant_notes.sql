-- Onda 30: notas de participante e notas pessoais por reunião

create table if not exists public.participant_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  participant_key text not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, participant_key)
);

create index if not exists participant_notes_user_key_idx
  on public.participant_notes (user_id, participant_key);

alter table public.meetings
  add column if not exists personal_notes text;

comment on table public.participant_notes is
  'Notas privadas do usuário sobre participantes (memória relacional).';

comment on column public.meetings.personal_notes is
  'Notas pessoais do usuário sobre a reunião (separadas do resumo IA).';

alter table public.participant_notes enable row level security;

create policy participant_notes_select_own on public.participant_notes
  for select using (user_id = auth.uid());

create policy participant_notes_insert_own on public.participant_notes
  for insert with check (user_id = auth.uid());

create policy participant_notes_update_own on public.participant_notes
  for update using (user_id = auth.uid());

create policy participant_notes_delete_own on public.participant_notes
  for delete using (user_id = auth.uid());

create trigger participant_notes_set_updated_at
  before update on public.participant_notes
  for each row execute function public.set_updated_at();
