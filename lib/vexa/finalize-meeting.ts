import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { processMeetingByNativeId } from "@/lib/pipeline/process-meeting";
import { applyMeetingStatus } from "@/lib/vexa/sync";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Marca a reunião como encerrada e dispara ingestão + análise.
 * Usado ao parar o bot manualmente ou ao detectar fim da reunião no poll.
 */
export async function finalizeStoppedMeeting(
  admin: AdminClient,
  platform: BotPlatform,
  nativeMeetingId: string,
  options?: { endTime?: string; startTime?: string | null }
): Promise<void> {
  await applyMeetingStatus(admin, {
    nativeMeetingId,
    vexaStatus: "completed",
    endTime: options?.endTime ?? new Date().toISOString(),
    startTime: options?.startTime,
  });

  try {
    await processMeetingByNativeId(admin, platform, nativeMeetingId);
  } catch (err) {
    console.error("Falha ao processar reunião encerrada:", err);
  }
}
