// Sobe bot-background.png para o bucket público `brand` no Supabase.
// Uso: npm run brand:upload
//
// Requer: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Opcional: BOT_BRAND_SOURCE_URL (default: NEXT_PUBLIC_APP_URL/brand/bot-background.png)

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const BUCKET = "brand";
const OBJECT_PATH = "bot-background.png";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
const sourceUrl =
  process.env.BOT_BRAND_SOURCE_URL?.trim() ??
  (appUrl ? `${appUrl}/brand/bot-background.png` : null);
const localFile = process.env.BOT_BRAND_LOCAL_FILE?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function loadImageBuffer() {
  if (localFile) {
    console.log(`Lendo arquivo local: ${localFile}`);
    return readFile(localFile);
  }

  if (!sourceUrl) {
    console.error(
      "Defina NEXT_PUBLIC_APP_URL, BOT_BRAND_SOURCE_URL ou BOT_BRAND_LOCAL_FILE."
    );
    process.exit(1);
  }

  console.log(`Baixando imagem de: ${sourceUrl}`);
  const res = await fetch(sourceUrl, { cache: "no-store" });
  if (!res.ok) {
    console.error(`Falha ao baixar (${res.status}): ${sourceUrl}`);
    process.exit(1);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const buffer = await loadImageBuffer();
  console.log(`Upload ${buffer.byteLength} bytes → ${BUCKET}/${OBJECT_PATH}`);

  const { error } = await supabase.storage.from(BUCKET).upload(OBJECT_PATH, buffer, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    console.error("Upload falhou:", error.message);
    console.error(
      "Rode antes: supabase db push  (migration do bucket `brand` precisa estar aplicada)"
    );
    process.exit(1);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(OBJECT_PATH);
  const publicUrl = data.publicUrl;

  console.log("\n✓ Upload concluído!\n");
  console.log("URL pública (use na Vercel se quiser explícito):");
  console.log(`  BOT_AVATAR_URL=${publicUrl}`);
  console.log(`  BOT_SCREEN_URL=${publicUrl}`);
  console.log("\nOu deixe vazio — o app usa Supabase automaticamente como 2ª opção.");
  console.log(`\nTeste no navegador: ${publicUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
