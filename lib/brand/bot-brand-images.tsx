import {
  BRAND_HEX,
  BRAND_HEX_DARK,
  BRAND_WORDMARK_DARK,
  PRODUCT_TAGLINE,
} from "@/lib/brand/config";
import {
  LOGO_COLORS,
  LOGO_MARK_TRACE_PATH,
  LOGO_MARK_VIEWBOX,
} from "@/lib/brand/logo-svg";

const fontFamily = "system-ui, -apple-system, sans-serif";

function BrandMarkSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox={LOGO_MARK_VIEWBOX} xmlns="http://www.w3.org/2000/svg">
      <path
        d={LOGO_MARK_TRACE_PATH}
        fill={LOGO_COLORS.mark}
        fillRule="evenodd"
      />
    </svg>
  );
}

function BrandWordmarkOg({ fontSize }: { fontSize: number }) {
  return (
    <div style={{ display: "flex", fontSize, fontWeight: 700, letterSpacing: -1.5 }}>
      <span style={{ color: "#FFFFFF" }}>Reuni</span>
      <span style={{ color: "#B8D4FF" }}>AI</span>
    </div>
  );
}

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
          width: 200,
          height: 200,
          borderRadius: 48,
          background: "rgba(255,255,255,0.14)",
          marginBottom: 40,
        }}
      >
        <BrandMarkSvg size={160} />
      </div>
      <BrandWordmarkOg fontSize={72} />
      <div
        style={{
          marginTop: 20,
          fontSize: 28,
          fontWeight: 500,
          opacity: 0.92,
          letterSpacing: 1,
          textTransform: "uppercase",
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
        background: BRAND_HEX,
        fontFamily,
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 152,
          height: 152,
          borderRadius: 36,
          background: "rgba(255,255,255,0.14)",
          marginBottom: 28,
        }}
      >
        <BrandMarkSvg size={120} />
      </div>
      <BrandWordmarkOg fontSize={48} />
      <div
        style={{
          marginTop: 12,
          fontSize: 18,
          opacity: 0.9,
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {PRODUCT_TAGLINE}
      </div>
    </div>
  );
}

/** Variante escura do wordmark para composições estáticas. */
export function BrandWordmarkStatic({ fontSize = 26 }: { fontSize?: number }) {
  return (
    <div style={{ display: "flex", fontSize, fontWeight: 700, letterSpacing: -0.5, fontFamily }}>
      <span style={{ color: BRAND_WORDMARK_DARK }}>Reuni</span>
      <span style={{ color: BRAND_HEX }}>AI</span>
    </div>
  );
}
