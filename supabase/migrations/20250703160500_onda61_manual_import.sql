-- Onda 61: importação manual de gravações

alter type public.transcript_source add value if not exists 'upload';

comment on type public.transcript_source is 'Origem da transcrição: bot Vexa, artifact nativo ou upload manual';
