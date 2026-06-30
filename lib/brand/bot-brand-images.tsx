import { BRAND_HEX, BRAND_HEX_DARK, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand/config";

const fontFamily = "system-ui, -apple-system, sans-serif";

/** Wallpaper para screen share do bot (16:9). */
export function BotBackgroundImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${BRAND_HEX} 0%, ${BRAND_HEX_DARK} 55%, #002d6e 100%)`,
        fontFamily,
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 160,
          height: 160,
          borderRadius: 40,
          background: "rgba(255,255,255,0.12)",
          fontSize: 88,
          fontWeight: 700,
          marginBottom: 40,
        }}
      >
        R
      </div>
      <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>{PRODUCT_NAME}</div>
      <div
        style={{
          marginTop: 20,
          fontSize: 32,
          fontWeight: 500,
          opacity: 0.9,
        }}
      >
        {PRODUCT_TAGLINE}
      </div>
    </div>
  );
}

/** Imagem da câmera virtual do bot (16:9). */
export function BotCameraImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(160deg, ${BRAND_HEX} 0%, ${BRAND_HEX_DARK} 100%)`,
        fontFamily,
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 120,
          height: 120,
          borderRadius: 32,
          background: "rgba(255,255,255,0.15)",
          fontSize: 64,
          fontWeight: 700,
          marginBottom: 28,
        }}
      >
        R
      </div>
      <div style={{ fontSize: 48, fontWeight: 700 }}>{PRODUCT_NAME}</div>
      <div style={{ marginTop: 12, fontSize: 22, opacity: 0.85 }}>{PRODUCT_TAGLINE}</div>
    </div>
  );
}
