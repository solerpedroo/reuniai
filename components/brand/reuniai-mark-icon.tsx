import {
  LOGO_COLORS,
  LOGO_MARK_EYES,
  LOGO_MARK_TRACE_PATH,
  LOGO_MARK_VIEWBOX,
  LOGO_MARK_WHITE_CUTOUTS,
} from "@/lib/brand/logo-svg";
import { cn } from "@/lib/utils";

type ReuniaiMarkIconProps = {
  className?: string;
  size?: number;
  title?: string;
  /** Preenche recortes (rosto e raios) com branco — use em favicon/PWA. */
  fillCutouts?: boolean;
};

/** Ícone da marca — path vetorial traçado do logo oficial. Fundo transparente. */
export function ReuniaiMarkIcon({
  className,
  size = 32,
  title = "ReuniAI",
  fillCutouts = false,
}: ReuniaiMarkIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LOGO_MARK_VIEWBOX}
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <path
        d={LOGO_MARK_TRACE_PATH}
        fill={LOGO_COLORS.mark}
        fillRule="evenodd"
      />
      {fillCutouts && (
        <>
          <path d={LOGO_MARK_WHITE_CUTOUTS} fill={LOGO_COLORS.cutout} />
          <path d={LOGO_MARK_EYES} fill={LOGO_COLORS.mark} />
        </>
      )}
    </svg>
  );
}
