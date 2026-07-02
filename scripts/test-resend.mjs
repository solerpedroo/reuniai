/**
 * Diagnóstico local do Resend.
 * Uso: node scripts/test-resend.mjs destinatario@email.com
 *
 * Sem domínio verificado, só o email da conta Resend recebe (403 nos demais).
 */
import { readFileSync } from "node:fs";

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const env = loadEnv(".env.local");
const apiKey = env.RESEND_API_KEY;
const from = env.RESEND_FROM ?? "ReuniAI <onboarding@resend.dev>";
const to = process.argv[2];

if (!apiKey) {
  console.error("RESEND_API_KEY ausente em .env.local");
  process.exit(1);
}
if (!to) {
  console.error("Uso: node scripts/test-resend.mjs <destinatario@email.com>");
  process.exit(1);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "ReuniAI — teste de envio",
    html: "<p>Se você recebeu isto, o Resend está funcionando.</p>",
  }),
});

const body = await res.text();
console.log(JSON.stringify({ from, to, status: res.status, body: JSON.parse(body) }, null, 2));
