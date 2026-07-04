"use client";

import { Clock } from "@phosphor-icons/react";
import { formatCountdownMs } from "@/lib/meetings/format-countdown";
import { useCountdownTo } from "@/lib/meetings/use-countdown";
import { cn } from "@/lib/utils";

export function LiveAutoLeaveCountdown({
  autoLeaveAt,
  className,
  compact = false,
}: {
  autoLeaveAt: string | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  const remainingMs = useCountdownTo(autoLeaveAt);

  if (remainingMs == null) {
    return null;
  }

  const label =
    remainingMs <= 0
      ? "Saindo agora…"
      : compact
        ? formatCountdownMs(remainingMs)
        : `Bot sai em ${formatCountdownMs(remainingMs)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        remainingMs <= 0 ? "text-amber-600 dark:text-amber-400" : undefined,
        className
      )}
      title={label}
    >
      <Clock size={14} className="shrink-0 opacity-70" aria-hidden />
      {label}
    </span>
  );
}
