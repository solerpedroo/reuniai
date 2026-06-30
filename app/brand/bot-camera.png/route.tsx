import { ImageResponse } from "next/og";
import { BotCameraImage } from "@/lib/brand/bot-brand-images";

export const runtime = "edge";

const size = { width: 1280, height: 720 };

/** PNG público para a câmera virtual do bot (via Vexa). */
export async function GET() {
  return new ImageResponse(<BotCameraImage />, {
    ...size,
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
