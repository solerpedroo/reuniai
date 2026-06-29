-- Onda 13: Inteligência proativa — sugestões de compromissos e digest semanal

alter type public.action_item_status add value if not exists 'suggested';

alter table public.profiles
  add column if not exists last_weekly_digest_at timestamptz;

comment on column public.profiles.last_weekly_digest_at is
  'Último envio do digest semanal por email (Onda 13.4)';
