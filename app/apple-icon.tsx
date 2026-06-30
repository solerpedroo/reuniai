import { ImageResponse } from "next/og";
import { BRAND_HEX, BRAND_HEX_DARK } from "@/lib/brand/config";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${BRAND_HEX} 0%, ${BRAND_HEX_DARK} 100%)`,
          borderRadius: 40,
          color: "white",
          fontSize: 96,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        R
      </div>
    ),
    { ...size }
  );
}
