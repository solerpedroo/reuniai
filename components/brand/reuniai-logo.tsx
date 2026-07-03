import { LogoMark } from "@/components/brand/logo-mark";
import { LogoWordmark } from "@/components/brand/logo-wordmark";
import { PRODUCT_TAGLINE } from "@/lib/brand/config";
import { cn } from "@/lib/utils";

type ReuniaiLogoProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
  markSize?: number;
  wordmarkSize?: "sm" | "md" | "lg";
  fillCutouts?: boolean;
};

export function ReuniaiLogo({
  className,
  compact = false,
  inverse = false,
  markSize: markSizeProp,
  wordmarkSize: wordmarkSizeProp,
  fillCutouts = false,
}: ReuniaiLogoProps) {
  const subtitleClass = inverse ? "text-white/70" : "text-muted-foreground";
  const markSize = markSizeProp ?? (compact ? 36 : 40);
  const wordmarkSize = wordmarkSizeProp ?? (compact ? "sm" : "md");

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <LogoMark size={markSize} fillCutouts={fillCutouts} />
        <LogoWordmark inverse={inverse} size={wordmarkSize} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <LogoMark size={markSize} fillCutouts={fillCutouts} />
      <div>
        <LogoWordmark inverse={inverse} size={wordmarkSize} />
        <p className={cn("text-xs", subtitleClass)}>{PRODUCT_TAGLINE}</p>
      </div>
    </div>
  );
}
