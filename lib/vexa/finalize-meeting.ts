import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { clearLiveRosterNames } from "@/lib/meetings/live-roster";
import { resolveDurationStartMs } from "@/lib/meetings/bot-session-time";
import { processMeetingByNativeId } from "@/lib/pipeline/process-meeting";

type AdminClient = ReturnType<typeof createAdminClient>;

type FinalizeMeetingRow = {
  id: string;
  status: string;
  started_at: string;
  bot_session_started_at: string | null;
};

const STUCK_RETRY_MIN_AGE_MS = 2 * 60_000;
const STUCK_RETRY_MAX_AGE_MS = 48 * 60 * 60_000;

const LIVE_STATUSES = new Set(["bot_joining", "recording"]);
const STUCK_TERMINAL_STATUSES = new Set(["processing", "completed", "partial"]);

async function countTranscriptSegments(
  admin: AdminClient,
  meetingId: string
): Promise<number> {
  const { count } = await admin
    .from("transcript_segments")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", meetingId);

  return count ?? 0;
}

async function runMeetingPipeline(
  admin: AdminClient,
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<void> {
  try {
    await processMeetingByNativeId(admin, platform, nativeMeetingId);
  } catch (err) {
    console.error("Falha ao processar reunião encerrada:", err);
  }
}

/**
 * Marca a reunião como encerrada e dispara ingestão + análise.
 * Claim atômico evita pipeline duplicado (webhook + poll + session em paralelo).
 * Reentra em reuniões já encerradas sem transcrição (ex.: bot removido manualmente).
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

  const segmentCount = await countTranscriptSegments(admin, meeting.id);
  const isLive = LIVE_STATUSES.has(meeting.status);
  const isStuckWithoutTranscript =
    !isLive && STUCK_TERMINAL_STATUSES.has(meeting.status) && segmentCount === 0;

  if (!isLive && !isStuckWithoutTranscript) {
    return;
  }

  if (isStuckWithoutTranscript) {
    await runMeetingPipeline(admin, platform, nativeMeetingId);
    return;
  }

  const startMs = resolveDurationStartMs(meeting);
  const endMs = new Date(endIso).getTime();
  const durationMs =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      ? endMs - startMs
      : null;

  const { data: claimed } = await admin
    .from("meetings")
    .update({
      status: "processing",
      ended_at: endIso,
      ...(durationMs != null ? { duration_ms: durationMs } : {}),
    })
    .eq("id", meeting.id)
    .in("status", ["bot_joining", "recording"])
    .select("id")
    .maybeSingle<{ id: string }>();

  if (!claimed) return;

  await clearLiveRosterNames(admin, meeting.id);
  await runMeetingPipeline(admin, platform, nativeMeetingId);
}

/**
 * Reprocessa reuniões encerradas há alguns minutos que ainda não têm transcrição.
 * Cobre casos em que o poll marcou `completed` antes de ingerir os segmentos.
 */
export async function retryStuckMeetingTranscripts(
  admin: AdminClient
): Promise<{ retried: number }> {
  const now = Date.now();
  const minEnded = new Date(now - STUCK_RETRY_MAX_AGE_MS).toISOString();

  const { data: meetings } = await admin
    .from("meetings")
    .select("id, meeting_url, recall_bot_id, ended_at")
    .in("status", ["processing", "completed", "partial"])
    .not("recall_bot_id", "is", null)
    .not("ended_at", "is", null)
    .gte("ended_at", minEnded);

  let retried = 0;

  for (const meeting of meetings ?? []) {
    if (!meeting.ended_at || !meeting.recall_bot_id) continue;

    const endedMs = new Date(meeting.ended_at).getTime();
    if (!Number.isFinite(endedMs) || now - endedMs < STUCK_RETRY_MIN_AGE_MS) {
      continue;
    }

    const segmentCount = await countTranscriptSegments(admin, meeting.id);
    if (segmentCount > 0) continue;

    const parsed = meeting.meeting_url ? parseMeetingUrl(meeting.meeting_url) : null;
    if (!parsed) continue;

    await runMeetingPipeline(admin, parsed.platform, meeting.recall_bot_id);
    retried += 1;
  }

  return { retried };
}
