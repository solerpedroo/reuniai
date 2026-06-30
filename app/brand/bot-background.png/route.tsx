import { ImageResponse } from "next/og";
import { BotBackgroundImage } from "@/lib/brand/bot-brand-images";

export const runtime = "edge";

const size = { width: 1920, height: 1080 };

/** PNG público para o fundo do bot (screen share via Vexa). */
export async function GET() {
  return new ImageResponse(<BotBackgroundImage />, {
    ...size,
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
