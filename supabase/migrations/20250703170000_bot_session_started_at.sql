-- Marca o instante real em que o bot entrou na call (paridade agendada vs ad-hoc).

alter table public.meetings
  add column if not exists bot_session_started_at timestamptz;

comment on column public.meetings.bot_session_started_at is
  'Horário em que o bot entrou na reunião; usado para elapsed ao vivo e duração real.';

-- Backfill: reuniões já gravadas usam started_at como melhor aproximação.
update public.meetings
set bot_session_started_at = started_at
where bot_session_started_at is null
  and recall_bot_id is not null
  and status in ('bot_joining', 'recording', 'processing', 'completed', 'partial', 'failed');
