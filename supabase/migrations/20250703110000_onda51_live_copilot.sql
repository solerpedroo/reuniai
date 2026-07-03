-- Onda 51: Copiloto ao vivo — decisões capturadas durante a call

alter type public.action_item_source add value if not exists 'live';

create table if not exists public.meeting_live_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  captured_at_ms integer not null check (captured_at_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists meeting_live_decisions_meeting_id_idx
  on public.meeting_live_decisions (meeting_id);

alter table public.meeting_live_decisions enable row level security;

create policy "meeting_live_decisions_select_own"
  on public.meeting_live_decisions for select to authenticated
  using (user_id = auth.uid());

create policy "meeting_live_decisions_insert_own"
  on public.meeting_live_decisions for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_meeting_owner(meeting_id)
  );

create policy "meeting_live_decisions_delete_own"
  on public.meeting_live_decisions for delete to authenticated
  using (user_id = auth.uid());
