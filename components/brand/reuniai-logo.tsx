import { VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

type ReuniaiLogoProps = {
  className?: string;
  compact?: boolean;
};

export function ReuniaiLogo({ className, compact = false }: ReuniaiLogoProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <VideoCamera size={18} weight="duotone" aria-hidden />
        </div>
        <span className="text-sm font-semibold tracking-tight">ReuniAI</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <VideoCamera size={22} weight="duotone" aria-hidden />
      </div>
      <div>
        <p className="text-[15px] font-semibold tracking-tight">ReuniAI</p>
        <p className="text-xs text-muted-foreground">Inteligência de reuniões</p>
      </div>
    </div>
  );
}
