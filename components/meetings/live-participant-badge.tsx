"use client";

import { UsersThree } from "@phosphor-icons/react";
import { LiveAutoLeaveCountdown } from "@/components/meetings/live-auto-leave-countdown";
import { shouldPollBotSession } from "@/lib/meetings/bot-lifecycle";
import { useMeetingSessionContext } from "@/lib/meetings/meeting-session-context";
import type { MeetingStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

function participantLabel(humanCount: number): string {
  if (humanCount === 0) return "Sala vazia";
  if (humanCount === 1) return "1 na call";
  return `${humanCount} na call`;
}

export function LiveParticipantBadge({
  status,
  recallBotId,
  className,
}: {
  status: MeetingStatus;
  recallBotId: string | null;
  className?: string;
}) {
  const session = useMeetingSessionContext();

  if (!shouldPollBotSession(status, recallBotId)) {
    return null;
  }

  if (!session?.live) {
    return null;
  }

  const participants = session.session?.participants;
  const humanCount = participants?.humanCount;

  if (humanCount == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
          className
        )}
      >
        <UsersThree size={14} aria-hidden />
        Participantes…
      </span>
    );
  }

  const emptyRoom = humanCount === 0;
  const label = participantLabel(humanCount);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-xs font-medium",
        emptyRoom
          ? "bg-muted text-muted-foreground"
          : "bg-brand/10 text-brand",
        className
      )}
      title={label}
    >
      <span className="inline-flex items-center gap-1.5">
        <UsersThree size={14} weight={emptyRoom ? "regular" : "fill"} aria-hidden />
        {label}
      </span>
      {emptyRoom && participants?.autoLeaveAt && (
        <>
          <span className="text-muted-foreground/50" aria-hidden>
            ·
          </span>
          <LiveAutoLeaveCountdown autoLeaveAt={participants.autoLeaveAt} compact />
        </>
      )}
    </span>
  );
}
