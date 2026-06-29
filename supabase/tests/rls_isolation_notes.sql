-- RLS isolation checks (Onda 11)
-- Execute no Supabase SQL Editor ou via psql após aplicar migrations.

-- 1. Como usuário A autenticado:
--    SELECT * FROM meetings WHERE user_id = auth.uid();
--    Esperado: apenas reuniões de A.

-- 2. Leitura cruzada (substitua UUIDs):
--    SELECT * FROM meetings WHERE id = '<meeting_id_de_usuario_B>';
--    Esperado: 0 linhas.

-- 3. Storage: upload em path de outro usuário deve falhar
--    bucket recordings, path: '<outro_user_id>/<meeting_id>/recording.mp4'
--    Esperado: policy violation.

-- 4. webhook_events como authenticated:
--    SELECT * FROM webhook_events;
--    Esperado: 0 linhas.

-- 5. API (com JWT de A tentando meeting de B):
--    node --env-file=.env.local scripts/test-rls-isolation.mjs <meeting_id_B>
--    Esperado: GET/DELETE/export → 404.
