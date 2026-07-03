-- Onda 66: lembrete matinal da fila de revisão (push proativo)

alter table public.profiles
  add column if not exists last_review_queue_reminder_at timestamptz;

comment on column public.profiles.last_review_queue_reminder_at is
  'Último envio do digest matinal da fila /revisar (fuso do perfil).';
