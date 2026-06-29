import type { MeetingStatus } from "@/lib/supabase/types";
import { STATUS_DOT_TONES, STATUS_LABELS, STATUS_TONES } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: MeetingStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        STATUS_TONES[status],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT_TONES[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}
