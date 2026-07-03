-- Onda 63: distribuição de resumo para participantes

create table public.participant_digests (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body text not null,
  share_token_id uuid references public.share_tokens (id) on delete set null,
  sent_at timestamptz not null default now()
);

create index participant_digests_meeting_id_idx on public.participant_digests (meeting_id);
create index participant_digests_user_id_idx on public.participant_digests (user_id);

alter table public.participant_digests enable row level security;

create policy participant_digests_select on public.participant_digests
  for select using (user_id = auth.uid());

create policy participant_digests_insert on public.participant_digests
  for insert with check (user_id = auth.uid());
