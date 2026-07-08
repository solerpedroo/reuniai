/**
 * Diagnóstico de autenticação Vexa — testa chaves bot/tx e escopos.
 * Uso: npm run vexa:key-test
 */
const base = (process.env.VEXA_API_BASE ?? "https://api.cloud.vexa.ai").replace(/\/$/, "");

const keys = [
  { label: "VEXA_API_KEY", value: process.env.VEXA_API_KEY?.trim() },
  { label: "VEXA_BOT_API_KEY", value: process.env.VEXA_BOT_API_KEY?.trim() },
  { label: "VEXA_TX_API_KEY", value: process.env.VEXA_TX_API_KEY?.trim() },
].filter((k) => k.value);

if (keys.length === 0) {
  console.error("Nenhuma chave Vexa definida (.env.local).");
  process.exit(1);
}

function scopeHint(key) {
  if (key.startsWith("vxa_bot_")) return "escopo bot";
  if (key.startsWith("vxa_tx_")) return "escopo tx";
  if (key.startsWith("vxa_")) return "escopo custom";
  return "legacy (full)";
}

async function probe(label, key, path) {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    cache: "no-store",
  });
  const text = (await res.text()).slice(0, 160);
  console.log(`  ${path} -> ${res.status} ${text}`);
}

console.log(`Base: ${base}\n`);

for (const { label, value } of keys) {
  console.log(`=== ${label} (${scopeHint(value)}) ===`);
  await probe(label, value, "/bots/status");
  await probe(label, value, "/meetings?limit=1");
  console.log("");
}

const botKey = process.env.VEXA_BOT_API_KEY?.trim() || process.env.VEXA_API_KEY?.trim();
const txKey = process.env.VEXA_TX_API_KEY?.trim() || process.env.VEXA_API_KEY?.trim();

console.log("Recomendação ReuniAI:");
if (botKey?.startsWith("vxa_bot_") && !txKey?.startsWith("vxa_tx_") && botKey === txKey) {
  console.log("  ⚠ Só há token vxa_bot_* — bots OK, mas transcrições exigem vxa_tx_* ou token legacy.");
  console.log("  Gere também VEXA_TX_API_KEY no painel Vexa (ou use token sem prefixo vxa_).");
}
console.log("  401 = chave inválida/expirada (contate suporte Vexa se conta nova falhar)");
console.log("  403 = escopo errado para o endpoint");
console.log("  200 = OK");
