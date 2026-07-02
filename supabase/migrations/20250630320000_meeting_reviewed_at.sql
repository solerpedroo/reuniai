alter table public.meetings
  add column if not exists meeting_reviewed_at timestamptz;

comment on column public.meetings.meeting_reviewed_at is
  'Timestamp when the user completed the post-call review wizard';

create index if not exists meetings_user_pending_review_idx
  on public.meetings (user_id, started_at desc)
  where status = 'completed' and meeting_reviewed_at is null;
