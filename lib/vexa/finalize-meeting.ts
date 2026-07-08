import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { clearLiveRosterNames } from "@/lib/meetings/live-roster";
import { resolveDurationStartMs } from "@/lib/meetings/bot-session-time";
import { analyzeMeetingById } from "@/lib/pipeline/analyze-meeting";
import { processMeetingByNativeId } from "@/lib/pipeline/process-meeting";
import { countMeetingTranscriptSegments } from "@/lib/vexa/retry-pending-transcript";

type AdminClient = ReturnType<typeof createAdminClient>;

type FinalizeMeetingRow = {
  id: string;
  status: string;
  started_at: string;
  bot_session_started_at: string | null;
};

/**
 * Marca a reunião como encerrada e dispara ingestão + análise.
 * Claim atômico evita pipeline duplicado (webhook + poll + session em paralelo).
 */
export async function finalizeStoppedMeeting(
  admin: AdminClient,
  platform: BotPlatform,
  nativeMeetingId: string,
  options?: { endTime?: string; startTime?: string | null }
): Promise<void> {
  const endIso = options?.endTime ?? new Date().toISOString();

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, status, started_at, bot_session_started_at")
    .eq("recall_bot_id", nativeMeetingId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<FinalizeMeetingRow>();

  if (!meeting) return;

  const segmentCount = await countMeetingTranscriptSegments(admin, meeting.id);

  if (meeting.status === "failed") return;
  if (meeting.status === "completed" && segmentCount > 0) return;

  if (segmentCount > 0) {
    try {
      await analyzeMeetingById(admin, meeting.id);
    } catch (err) {
      console.error("Falha ao analisar reunião com transcrição existente:", err);
    }
    return;
  }

  const startMs = resolveDurationStartMs(meeting);
  const endMs = new Date(endIso).getTime();
  const durationMs =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      ? endMs - startMs
      : null;

  const endPatch = {
    ended_at: endIso,
    ...(durationMs != null ? { duration_ms: durationMs } : {}),
  };

  if (meeting.status === "bot_joining" || meeting.status === "recording") {
    const { data: claimed } = await admin
      .from("meetings")
      .update({ status: "processing", ...endPatch })
      .eq("id", meeting.id)
      .in("status", ["bot_joining", "recording"])
      .select("id")
      .maybeSingle<{ id: string }>();

    if (!claimed) return;
  } else if (meeting.status === "processing" || meeting.status === "partial") {
    await admin
      .from("meetings")
      .update({ status: "processing", ...endPatch })
      .eq("id", meeting.id)
      .in("status", ["processing", "partial"]);
  } else {
    return;
  }

  await clearLiveRosterNames(admin, meeting.id);

  try {
    await processMeetingByNativeId(admin, platform, nativeMeetingId);
  } catch (err) {
    console.error("Falha ao processar reunião encerrada:", err);
  }
}
