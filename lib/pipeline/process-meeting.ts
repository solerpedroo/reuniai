import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { analyzeMeetingById } from "@/lib/pipeline/analyze-meeting";
import { ingestByNativeId, ingestMeetingTranscript } from "@/lib/pipeline/ingest-transcript";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Pipeline pós-reunião: ingere a transcrição do Vexa e, em seguida, gera a
 * análise por IA (resumo, decisões, action items). Resolve a reunião pelo
 * identificador nativo do bot.
 */
export async function processMeetingByNativeId(
  admin: AdminClient,
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<void> {
  const ingest = await ingestByNativeId(admin, platform, nativeMeetingId);
  if (!ingest) return;
  await analyzeMeetingById(admin, ingest.meetingId);
}

/** Mesma pipeline, mas para uma reunião já conhecida (rota manual). */
export async function processMeetingById(
  admin: AdminClient,
  meetingId: string,
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<void> {
  await ingestMeetingTranscript(admin, { meetingId, platform, nativeMeetingId });
  await analyzeMeetingById(admin, meetingId);
}
