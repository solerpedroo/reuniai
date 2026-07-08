import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { finalizeStoppedMeeting } from "@/lib/vexa/finalize-meeting";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Tempo mínimo após encerramento para o Vexa consolidar a transcrição. */
const INGEST_GRACE_MS = 90_000;
const MAX_RETRY_AGE_MS = 48 * 60 * 60_000;
/** Após este prazo sem trechos, marca falha permanente. */
const GIVE_UP_AFTER_MS = 6 * 60 * 60_000;

export async function countMeetingTranscriptSegments(
  admin: AdminClient,
  meetingId: string
): Promise<number> {
  const { count } = await admin
    .from("transcript_segments")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", meetingId);

  return count ?? 0;
}

/**
 * Reprocessa reuniões encerradas sem trechos persistidos (ex.: parada manual do bot
 * antes do Vexa finalizar a transcrição).
 */
export async function retryMeetingsPendingTranscript(
  admin: AdminClient
): Promise<{ candidates: number; retried: number; failed: number }> {
  const now = Date.now();
  const graceCutoff = new Date(now - INGEST_GRACE_MS).toISOString();
  const startedCutoff = new Date(now - MAX_RETRY_AGE_MS).toISOString();

  const { data: meetings } = await admin
    .from("meetings")
    .select("id, recall_bot_id, meeting_url, status, ended_at, started_at")
    .in("status", ["processing", "partial"])
    .not("recall_bot_id", "is", null)
    .not("ended_at", "is", null)
    .lte("ended_at", graceCutoff)
    .gte("started_at", startedCutoff);

  let retried = 0;
  let failed = 0;

  for (const meeting of meetings ?? []) {
    const segmentCount = await countMeetingTranscriptSegments(admin, meeting.id);
    if (segmentCount > 0) continue;

    const endedMs = meeting.ended_at ? new Date(meeting.ended_at).getTime() : NaN;
    if (Number.isFinite(endedMs) && now - endedMs > GIVE_UP_AFTER_MS) {
      await admin
        .from("meetings")
        .update({
          status: "failed",
          error_message:
            "A transcrição não ficou disponível após o encerramento do bot. Use “Buscar transcrição” ou verifique o provedor.",
        })
        .eq("id", meeting.id)
        .in("status", ["processing", "partial"]);
      failed += 1;
      continue;
    }

    const parsed = meeting.meeting_url ? parseMeetingUrl(meeting.meeting_url) : null;
    if (!parsed || !meeting.recall_bot_id) continue;

    try {
      await finalizeStoppedMeeting(admin, parsed.platform, meeting.recall_bot_id, {
        endTime: meeting.ended_at ?? new Date().toISOString(),
      });
      retried += 1;
    } catch (err) {
      console.error(`Falha ao reprocessar transcrição ${meeting.id}:`, err);
    }
  }

  return { candidates: meetings?.length ?? 0, retried, failed };
}
