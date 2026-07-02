-- Onda 22: centro de alertas — kind, dedupe e lembrete matinal de tarefas

alter table public.notifications
  add column if not exists kind text,
  add column if not exists dedupe_key text;

comment on column public.notifications.kind is
  'Tipo do alerta: prep | completed | bot_failed | tasks_due';

comment on column public.notifications.dedupe_key is
  'Chave idempotente por usuário para evitar spam de notificações repetidas';

create unique index if not exists notifications_user_dedupe_key_unique
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists notifications_user_kind_created_idx
  on public.notifications (user_id, kind, created_at desc)
  where kind is not null;

alter table public.profiles
  add column if not exists last_tasks_due_reminder_at timestamptz;

comment on column public.profiles.last_tasks_due_reminder_at is
  'Último lembrete matinal de action items vencendo hoje (timezone do perfil)';

-- Atualiza default de novos perfis com prefs granulares da Onda 22
alter table public.profiles
  alter column notification_prefs set default
    '{"email": false, "push": false, "prep": true, "completed": true, "digest": true, "bot_failed": true, "tasks_due": true}'::jsonb;
