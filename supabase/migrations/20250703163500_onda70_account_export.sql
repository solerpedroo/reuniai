-- Onda 70: rate limit de export LGPD

alter table public.profiles
  add column if not exists last_account_export_at timestamptz;

comment on column public.profiles.last_account_export_at is
  'Timestamp do último export completo de dados (LGPD) — limite 1×/24h.';
