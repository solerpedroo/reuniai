-- Nomes humanos já vistos na call (roster sticky) para contagem ao vivo.

alter table public.meetings
  add column if not exists live_roster_names text[] not null default '{}';

comment on column public.meetings.live_roster_names is
  'Nomes normalizados de participantes humanos detectados durante a sessão ao vivo do bot.';
