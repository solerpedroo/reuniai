-- Onda 16: multi-plataforma enterprise (transcript nativo, artifact refs)

create type public.transcript_source as enum ('vexa', 'teams_native', 'meet_native');

alter table public.meetings
  add column if not exists transcript_source public.transcript_source,
  add column if not exists native_artifact_id text,
  add column if not exists prefer_native_transcript boolean not null default false;

comment on column public.meetings.transcript_source is 'Origem da transcrição ingerida (bot Vexa ou artifact nativo)';
comment on column public.meetings.native_artifact_id is 'Teams onlineMeetingId ou Meet conferenceRecord resource name';
comment on column public.meetings.prefer_native_transcript is 'Pular bot e aguardar transcript nativo da plataforma';

create index if not exists meetings_native_transcript_poll_idx
  on public.meetings (platform, status, started_at)
  where native_artifact_id is not null or prefer_native_transcript = true;
