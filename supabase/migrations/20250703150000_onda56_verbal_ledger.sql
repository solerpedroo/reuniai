-- Onda 56: ledger de compromissos verbais (separado de action_items)

create type public.commitment_direction as enum ('i_owe', 'they_owe', 'mutual');
create type public.verbal_commitment_status as enum ('pending', 'fulfilled', 'overdue', 'disputed');

create table public.verbal_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  direction public.commitment_direction not null,
  status public.verbal_commitment_status not null default 'pending',
  counterparty text,
  due_date date,
  source_quote text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verbal_commitments_user_id_idx on public.verbal_commitments (user_id);
create index verbal_commitments_meeting_id_idx on public.verbal_commitments (meeting_id);
create index verbal_commitments_status_idx on public.verbal_commitments (user_id, status);

create trigger verbal_commitments_set_updated_at
  before update on public.verbal_commitments
  for each row execute function public.set_updated_at();

alter table public.verbal_commitments enable row level security;

create policy "verbal_commitments_select_own"
  on public.verbal_commitments for select to authenticated
  using (user_id = auth.uid());

create policy "verbal_commitments_insert_own"
  on public.verbal_commitments for insert to authenticated
  with check (user_id = auth.uid() and public.is_meeting_owner(meeting_id));

create policy "verbal_commitments_update_own"
  on public.verbal_commitments for update to authenticated
  using (user_id = auth.uid());

create policy "verbal_commitments_delete_own"
  on public.verbal_commitments for delete to authenticated
  using (user_id = auth.uid());
