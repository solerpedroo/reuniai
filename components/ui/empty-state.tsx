import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type EmptyStateTone = "default" | "brand" | "success" | "muted";

const TONE_STYLES: Record<EmptyStateTone, string> = {
  default: "border-border/80 bg-muted/20",
  brand: "border-brand/20 bg-gradient-to-b from-brand/8 to-transparent",
  success: "border-emerald-500/20 bg-gradient-to-b from-emerald-500/8 to-transparent",
  muted: "border-border/60 bg-card/50",
};

const ICON_TONE_STYLES: Record<EmptyStateTone, string> = {
  default: "bg-muted text-muted-foreground",
  brand: "bg-brand/12 text-brand",
  success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  muted: "bg-muted text-muted-foreground",
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = "default",
  className,
  children,
}: {
  icon: Icon;
  title: string;
  description?: string;
  tone?: EmptyStateTone;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center",
        TONE_STYLES[tone],
        className
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl",
          ICON_TONE_STYLES[tone]
        )}
      >
        <Icon size={24} weight="duotone" aria-hidden />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
