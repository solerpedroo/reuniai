import { ImageResponse } from "next/og";
import {
  LOGO_COLORS,
  LOGO_MARK_EYES,
  LOGO_MARK_TRACE_PATH,
  LOGO_MARK_VIEWBOX,
  LOGO_MARK_WHITE_CUTOUTS,
} from "@/lib/brand/logo-svg";

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
          background: "transparent",
        }}
      >
        <svg width={160} height={160} viewBox={LOGO_MARK_VIEWBOX} xmlns="http://www.w3.org/2000/svg">
          <path
            d={LOGO_MARK_TRACE_PATH}
            fill={LOGO_COLORS.mark}
            fillRule="evenodd"
          />
          <path d={LOGO_MARK_WHITE_CUTOUTS} fill={LOGO_COLORS.cutout} />
          <path d={LOGO_MARK_EYES} fill={LOGO_COLORS.mark} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
