import { ImageResponse } from "next/og";
import {
  LOGO_COLORS,
  LOGO_MARK_EYES,
  LOGO_MARK_TRACE_PATH,
  LOGO_MARK_VIEWBOX,
  LOGO_MARK_WHITE_CUTOUTS,
} from "@/lib/brand/logo-svg";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg width={32} height={32} viewBox={LOGO_MARK_VIEWBOX} xmlns="http://www.w3.org/2000/svg">
        <path
          d={LOGO_MARK_TRACE_PATH}
          fill={LOGO_COLORS.mark}
          fillRule="evenodd"
        />
        <path d={LOGO_MARK_WHITE_CUTOUTS} fill={LOGO_COLORS.cutout} />
        <path d={LOGO_MARK_EYES} fill={LOGO_COLORS.mark} />
      </svg>
    ),
    { ...size }
  );
}
