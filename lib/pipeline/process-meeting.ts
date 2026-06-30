import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { analyzeMeetingById } from "@/lib/pipeline/analyze-meeting";
import {
  ingestByNativeId,
  ingestMeetingWithFallback,
  TranscriptUnavailableError,
} from "@/lib/pipeline/ingest-fallback";
import { ingestMeetingTranscript } from "@/lib/pipeline/ingest-transcript";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Pipeline pós-reunião com fallback chain (Vexa → nativo Teams/Meet).
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

/** Pipeline por meeting ID com fallback nativo. */
export async function processMeetingById(
  admin: AdminClient,
  meetingId: string,
  platform?: BotPlatform,
  nativeMeetingId?: string
): Promise<void> {
  if (platform && nativeMeetingId) {
    await ingestMeetingTranscript(admin, { meetingId, platform, nativeMeetingId });
  } else {
    await ingestMeetingWithFallback(admin, meetingId);
  }
  await analyzeMeetingById(admin, meetingId);
}

export async function processMeetingWithFallback(
  admin: AdminClient,
  meetingId: string
): Promise<void> {
  try {
    await ingestMeetingWithFallback(admin, meetingId);
    await analyzeMeetingById(admin, meetingId);
  } catch (err) {
    if (err instanceof TranscriptUnavailableError) {
      await admin
        .from("meetings")
        .update({
          status: "failed",
          error_message: err.message.slice(0, 500),
        })
        .eq("id", meetingId);
    }
    throw err;
  }
}

export { TranscriptUnavailableError };
