"use client";

import { deriveBotUiPhase } from "@/lib/meetings/bot-lifecycle";
import { useMeetingSessionContext } from "@/lib/meetings/meeting-session-context";
import { STATUS_DOT_TONES, STATUS_LABELS, STATUS_TONES } from "@/lib/meetings/types";
import type { MeetingStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const PHASE_LABELS: Partial<Record<ReturnType<typeof deriveBotUiPhase>, string>> = {
  joining: "Bot entrando",
  in_call: "Bot na reunião",
  recording: "Gravando",
  stopping: "Encerrando",
  processing: "Processando",
};

export function LiveStatusBadge({
  status,
  className,
}: {
  status: MeetingStatus;
  className?: string;
}) {
  const session = useMeetingSessionContext();
  const phase = deriveBotUiPhase(status, session?.session ?? null);
  const liveLabel = PHASE_LABELS[phase];
  const label = liveLabel ?? STATUS_LABELS[status];
  const tone = liveLabel ? STATUS_TONES[phase === "stopping" ? "recording" : status] : STATUS_TONES[status];
  const dotTone =
    phase === "recording" || phase === "stopping"
      ? STATUS_DOT_TONES.recording
      : phase === "in_call"
        ? STATUS_DOT_TONES.bot_joining
        : STATUS_DOT_TONES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        tone,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotTone)} />
      {label}
    </span>
  );
}
