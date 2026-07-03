-- Onda 60: ensaio de conversa (roleplay com IA)

create table public.conversation_rehearsals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  participant_key text,
  scenario text not null check (char_length(trim(scenario)) > 0),
  messages jsonb not null default '[]'::jsonb,
  feedback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversation_rehearsals_user_id_idx
  on public.conversation_rehearsals (user_id);

create trigger conversation_rehearsals_set_updated_at
  before update on public.conversation_rehearsals
  for each row execute function public.set_updated_at();

alter table public.conversation_rehearsals enable row level security;

create policy "conversation_rehearsals_select_own"
  on public.conversation_rehearsals for select to authenticated
  using (user_id = auth.uid());

create policy "conversation_rehearsals_insert_own"
  on public.conversation_rehearsals for insert to authenticated
  with check (user_id = auth.uid());

create policy "conversation_rehearsals_update_own"
  on public.conversation_rehearsals for update to authenticated
  using (user_id = auth.uid());

create policy "conversation_rehearsals_delete_own"
  on public.conversation_rehearsals for delete to authenticated
  using (user_id = auth.uid());
