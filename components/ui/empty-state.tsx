import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type EmptyStateTone = "default" | "brand" | "success" | "muted";

const TONE_STYLES: Record<EmptyStateTone, string> = {
  default: "border-border/80 bg-muted/20",
  brand: "border-brand/20 bg-gradient-to-b from-brand/8 to-transparent",
  success: "border-emerald-500/20 bg-gradient-to-b from-emerald-500/8 to-transparent",
  muted: "border-border/60 bg-card/50",
};

const MESH_STYLES: Record<EmptyStateTone, string> = {
  default: "from-muted/30 via-transparent to-transparent",
  brand: "from-brand/15 via-brand/5 to-transparent",
  success: "from-emerald-500/12 via-transparent to-transparent",
  muted: "from-muted/25 via-transparent to-transparent",
};

const ICON_TONE_STYLES: Record<EmptyStateTone, string> = {
  default: "bg-muted text-muted-foreground",
  brand: "bg-brand/12 text-brand ring-1 ring-brand/15",
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
        "relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border px-6 py-12 text-center",
        TONE_STYLES[tone],
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))]",
          MESH_STYLES[tone]
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-brand/8 blur-2xl"
      />

      <div
        className={cn(
          "relative flex size-12 items-center justify-center rounded-xl",
          ICON_TONE_STYLES[tone]
        )}
      >
        <Icon size={24} weight="duotone" aria-hidden />
      </div>
      <div className="relative max-w-sm space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="relative">{children}</div>}
    </div>
  );
}
