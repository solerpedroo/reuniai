import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { resolveDurationStartMs } from "@/lib/meetings/bot-session-time";
import { processMeetingByNativeId } from "@/lib/pipeline/process-meeting";

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

  if (["processing", "completed", "partial", "failed"].includes(meeting.status)) {
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

  try {
    await processMeetingByNativeId(admin, platform, nativeMeetingId);
  } catch (err) {
    console.error("Falha ao processar reunião encerrada:", err);
  }
}
