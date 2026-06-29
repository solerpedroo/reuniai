import { VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

type ReuniaiLogoProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
};

export function ReuniaiLogo({ className, compact = false, inverse = false }: ReuniaiLogoProps) {
  const titleClass = inverse ? "text-white" : "text-foreground";
  const subtitleClass = inverse ? "text-white/70" : "text-muted-foreground";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm brand-glow">
          <VideoCamera size={18} weight="duotone" aria-hidden />
        </div>
        <span className={cn("text-sm font-semibold tracking-tight", titleClass)}>ReuniAI</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm brand-glow">
        <VideoCamera size={22} weight="duotone" aria-hidden />
      </div>
      <div>
        <p className={cn("text-[15px] font-semibold tracking-tight", titleClass)}>ReuniAI</p>
        <p className={cn("text-xs", subtitleClass)}>Inteligência de reuniões</p>
      </div>
    </div>
  );
}
