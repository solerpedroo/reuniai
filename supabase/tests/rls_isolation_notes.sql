-- Manual RLS isolation checks (run in Supabase SQL Editor as each user)
-- Onda 2 — não executado automaticamente; use após aplicar migrations.

-- 1. Como usuário A autenticado (JWT no SQL editor ou client):
--    INSERT meeting com user_id = auth.uid() deve funcionar.
--    SELECT em meetings deve retornar apenas reuniões de A.

-- 2. Tentar ler meeting de outro usuário (substitua UUIDs):
--    SELECT * FROM meetings WHERE id = '<meeting_id_de_usuario_B>';
--    Esperado: 0 linhas (RLS filtra).

-- 3. Storage: upload em path errado deve falhar
--    bucket recordings, path: '<outro_user_id>/<meeting_id>/file.mp4'
--    Esperado: policy violation.

-- 4. webhook_events como authenticated:
--    SELECT * FROM webhook_events;
--    Esperado: 0 linhas (sem policy para authenticated).

-- 5. Service role (admin client) bypassa RLS para pipeline jobs.
