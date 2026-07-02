-- Onda 28: fila de revisão em batch (/revisar)

alter table public.meetings
  add column if not exists review_snoozed_until timestamptz;

comment on column public.meetings.review_snoozed_until is
  'Revisão pós-call adiada até esta data (timezone do usuário na UI).';

alter table public.meeting_follow_ups
  add column if not exists follow_up_done_at timestamptz;

comment on column public.meeting_follow_ups.follow_up_done_at is
  'Marca follow-up como concluído localmente (sem envio Resend).';

drop index if exists public.meetings_user_pending_review_idx;

create index meetings_user_review_queue_idx on public.meetings (user_id, started_at desc)
  where status = 'completed'
    and meeting_reviewed_at is null;
