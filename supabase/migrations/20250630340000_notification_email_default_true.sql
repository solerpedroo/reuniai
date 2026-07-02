-- Habilita email de notificações por padrão para novos perfis e contas existentes

alter table public.profiles
  alter column notification_prefs set default
    '{"email": true, "push": false, "prep": true, "completed": true, "digest": true, "bot_failed": true, "tasks_due": true}'::jsonb;

update public.profiles
set notification_prefs = notification_prefs || '{"email": true}'::jsonb
where coalesce((notification_prefs->>'email')::boolean, false) = false;
