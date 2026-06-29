-- Onda 12: busca semântica via RPC + vistas salvas

alter table public.profiles
  add column if not exists saved_views jsonb not null default '[]'::jsonb;

-- Busca vetorial cross-meeting respeitando RLS (security invoker + auth.uid())
create or replace function public.match_transcript_embeddings(
  query_embedding extensions.vector(1536),
  match_count int default 24
)
returns table (
  segment_id uuid,
  meeting_id uuid,
  start_ms int,
  speaker_label text,
  segment_text text,
  meeting_title text,
  started_at timestamptz,
  similarity float
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    te.segment_id,
    te.meeting_id,
    ts.start_ms,
    ts.speaker_label,
    ts.text as segment_text,
    m.title as meeting_title,
    m.started_at,
    (1 - (te.embedding <=> query_embedding))::float as similarity
  from public.transcript_embeddings te
  inner join public.transcript_segments ts on ts.id = te.segment_id
  inner join public.meetings m on m.id = te.meeting_id
  where m.user_id = (select auth.uid())
  order by te.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_transcript_embeddings(extensions.vector(1536), int)
  to authenticated;
