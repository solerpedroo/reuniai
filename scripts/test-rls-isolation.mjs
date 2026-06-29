#!/usr/bin/env node
/**
 * Verifica isolamento de reuniões via API (Onda 11).
 *
 * Uso:
 *   node --env-file=.env.local scripts/test-rls-isolation.mjs <meeting_id_de_outro_usuario>
 *
 * Pré-requisitos:
 * - Usuário autenticado no navegador com sessão válida NÃO é necessário aqui.
 * - Defina TEST_USER_ACCESS_TOKEN (JWT de um usuário A) e MEETING_ID_B (reunião do usuário B).
 *
 * Esperado: GET e DELETE retornam 404; export retorna 404.
 */

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const token = process.env.TEST_USER_ACCESS_TOKEN;
const meetingId = process.argv[2] ?? process.env.MEETING_ID_B;

if (!token || !meetingId) {
  console.error(
    "Defina TEST_USER_ACCESS_TOKEN e informe MEETING_ID_B (arg ou env) para rodar o teste."
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Cookie: "",
};

async function check(path, method = "GET") {
  const res = await fetch(`${baseUrl}${path}`, { method, headers });
  return { path, method, status: res.status };
}

async function main() {
  const checks = await Promise.all([
    check(`/api/meetings/${meetingId}`),
    check(`/api/meetings/${meetingId}`, "DELETE"),
    check(`/api/meetings/${meetingId}/export?format=md`),
  ]);

  let failed = 0;
  for (const result of checks) {
    const ok = result.status === 404;
    console.log(`${ok ? "PASS" : "FAIL"} ${result.method} ${result.path} → ${result.status}`);
    if (!ok) failed += 1;
  }

  if (failed > 0) {
    console.error(`\n${failed} verificação(ões) falharam.`);
    process.exit(1);
  }

  console.log("\nIsolamento OK: usuário A não acessa reunião de B.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
