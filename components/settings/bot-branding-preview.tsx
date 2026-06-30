import Image from "next/image";
import { BRAND_ASSETS, BOT_DISPLAY_NAME, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand/config";

/** Preview do bot nas calls — avatar com câmera e fundo personalizado. */
export function BotBrandingPreview() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
        <div className="relative aspect-video w-full bg-black">
          <Image
            src={BRAND_ASSETS.botCamera}
            alt={`${BOT_DISPLAY_NAME} com câmera ligada`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm">
            <span className="size-2 rounded-full bg-red-500" aria-hidden />
            {BOT_DISPLAY_NAME}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Nas calls, o <strong className="font-medium text-foreground">{BOT_DISPLAY_NAME}</strong> aparece
        com câmera ligada e fundo personalizado do {PRODUCT_NAME}. O compartilhamento de tela exibe o
        wallpaper de marca como fallback em plataformas sem câmera virtual.
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Image
          src={BRAND_ASSETS.logoMark}
          alt=""
          width={20}
          height={20}
          className="rounded"
          aria-hidden
        />
        {PRODUCT_TAGLINE}
      </div>
    </div>
  );
}
