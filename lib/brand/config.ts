/** Fonte única de verdade para identidade visual do ReuniAI. */

export const PRODUCT_NAME = "ReuniAI" as const;
export const PRODUCT_TAGLINE = "Inteligência de reuniões" as const;
export const PRODUCT_CONTEXT = "Transcrição · Resumo · Action items" as const;

/** #0064F5 — alinhado com --brand em globals.css */
export const BRAND_HEX = "#0064F5" as const;
export const BRAND_HEX_DARK = "#0047B8" as const;

/** Fallback genérico quando não há contexto de usuário (páginas públicas). */
export const BOT_DISPLAY_NAME_FALLBACK = `${PRODUCT_NAME} Bot`;

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;

  return "https://reuniai.vercel.app";
}

/** Caminhos públicos de assets de marca (servidos em /brand/*). */
export const BRAND_ASSETS = {
  logoMark: "/brand/logo-mark.svg",
  logoFull: "/brand/logo-full.svg",
  botCamera: "/brand/bot-camera.png",
  botBackground: "/brand/bot-background.png",
} as const;

export const PRODUCT = {
  name: PRODUCT_NAME,
  tagline: PRODUCT_TAGLINE,
  context: PRODUCT_CONTEXT,
} as const;
