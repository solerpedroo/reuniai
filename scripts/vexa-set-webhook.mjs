// Registra a URL de webhook do Vexa.
// Uso: npm run vexa:webhook -- https://seu-dominio.com
//   (ou defina APP_URL no ambiente)
//
// A URL precisa ser PÚBLICA — o Vexa rejeita localhost/IPs internos (SSRF).
// Carrega variáveis de .env.local via --env-file.

const base = (process.env.VEXA_API_BASE ?? "https://api.cloud.vexa.ai").replace(/\/$/, "");
const apiKey = process.env.VEXA_API_KEY;
const secret = process.env.VEXA_WEBHOOK_SECRET;

const appUrl = process.argv[2] ?? process.env.APP_URL;

if (!apiKey) {
  console.error("Falta VEXA_API_KEY no ambiente (.env.local).");
  process.exit(1);
}
if (!appUrl) {
  console.error("Informe a URL pública: npm run vexa:webhook -- https://seu-dominio.com");
  process.exit(1);
}

const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/vexa`;

const res = await fetch(`${base}/user/webhook`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
  body: JSON.stringify({ webhook_url: webhookUrl, webhook_secret: secret }),
});

if (!res.ok) {
  console.error(`Falha (${res.status}): ${await res.text()}`);
  process.exit(1);
}

console.log(`Webhook registrado: ${webhookUrl}`);
