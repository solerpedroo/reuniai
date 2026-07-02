-- Onda 32: tracking de envio transacional de follow-up por email

alter table public.meeting_follow_ups
  add column if not exists sent_at timestamptz,
  add column if not exists sent_to text[];

comment on column public.meeting_follow_ups.sent_at is
  'Quando o follow-up foi enviado via Resend.';

comment on column public.meeting_follow_ups.sent_to is
  'Destinatários do último envio transacional.';
