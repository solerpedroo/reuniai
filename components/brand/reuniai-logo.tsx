import { LogoMark } from "@/components/brand/logo-mark";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand/config";
import { cn } from "@/lib/utils";

type ReuniaiLogoProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
};

export function ReuniaiLogo({ className, compact = false, inverse = false }: ReuniaiLogoProps) {
  const titleClass = inverse ? "text-white" : "text-foreground";
  const subtitleClass = inverse ? "text-white/70" : "text-muted-foreground";
  const markSize = compact ? 32 : 40;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <LogoMark size={markSize} className="rounded-lg shadow-sm brand-glow" />
        <span className={cn("text-sm font-semibold tracking-tight", titleClass)}>{PRODUCT_NAME}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={markSize} className="rounded-xl shadow-sm brand-glow" />
      <div>
        <p className={cn("text-[15px] font-semibold tracking-tight", titleClass)}>{PRODUCT_NAME}</p>
        <p className={cn("text-xs", subtitleClass)}>{PRODUCT_TAGLINE}</p>
      </div>
    </div>
  );
}
