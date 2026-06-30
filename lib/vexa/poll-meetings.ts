import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { stopBot } from "@/lib/vexa/client";
import { finalizeStoppedMeeting } from "@/lib/vexa/finalize-meeting";
import {
  getRunningBotsByNativeId,
  getVexaMeetingsByNativeId,
  resolveVexaMeetingStatus,
  shouldAutoLeaveEmptyMeeting,
} from "@/lib/vexa/meeting-state";
import { applyMeetingStatus, mapVexaStatus } from "@/lib/vexa/sync";
import { scheduleBotBranding } from "@/lib/vexa/branding";

type AdminClient = ReturnType<typeof createAdminClient>;

export type PollMeetingsSummary = {
  tracked: number;
  updated: number;
  autoLeft: number;
  processed: number;
};

function meetingKey(platform: string, nativeMeetingId: string): string {
  return `${platform}:${nativeMeetingId}`;
}

/**
 * Sincroniza status das reuniões ativas com o Vexa, encerra bots em salas vazias
 * e dispara o pipeline quando a reunião termina.
 */
export async function pollActiveMeetings(admin: AdminClient): Promise<PollMeetingsSummary> {
  const { data: meetings } = await admin
    .from("meetings")
    .select("id, recall_bot_id, meeting_url, status, started_at")
    .in("status", ["bot_joining", "recording", "processing"])
    .not("recall_bot_id", "is", null);

  if (!meetings || meetings.length === 0) {
    return { tracked: 0, updated: 0, autoLeft: 0, processed: 0 };
  }

  const [vexaMeetingsByNative, runningBotsByNative] = await Promise.all([
    getVexaMeetingsByNativeId(),
    getRunningBotsByNativeId(),
  ]);

  let updated = 0;
  let autoLeft = 0;
  let processed = 0;

  for (const meeting of meetings) {
    const nativeId = meeting.recall_bot_id;
    if (!nativeId) continue;

    const parsed = meeting.meeting_url ? parseMeetingUrl(meeting.meeting_url) : null;
    if (!parsed) continue;

    const key = meetingKey(parsed.platform, nativeId);
    const vexaMeeting = vexaMeetingsByNative.get(key) ?? null;
    const container = runningBotsByNative.get(key) ?? null;

    const vexaStatus = resolveVexaMeetingStatus({
      vexaMeeting,
      container,
      dbStatus: meeting.status,
      meetingStartedAt: meeting.started_at,
    });

    // Bot ainda na call enquanto DB já está em processamento → força saída.
    if (meeting.status === "processing" && container?.containerUp) {
      try {
        await stopBot(parsed.platform, nativeId);
        autoLeft += 1;
      } catch (err) {
        console.error("Falha ao remover bot órfão em processamento:", err);
      }
      continue;
    }

    // Sala vazia: encerra o bot proativamente.
    if (
      meeting.status === "recording" &&
      container?.containerUp &&
      (await shouldAutoLeaveEmptyMeeting(
        parsed.platform,
        nativeId,
        vexaStatus,
        vexaMeeting?.start_time ?? meeting.started_at
      ))
    ) {
      try {
        await stopBot(parsed.platform, nativeId);
        await finalizeStoppedMeeting(admin, parsed.platform, nativeId, {
          endTime: new Date().toISOString(),
          startTime: vexaMeeting?.start_time ?? meeting.started_at,
        });
        autoLeft += 1;
        processed += 1;
      } catch (err) {
        console.error("Falha ao encerrar bot em sala vazia:", err);
      }
      continue;
    }

    const result = await applyMeetingStatus(admin, {
      nativeMeetingId: nativeId,
      vexaStatus,
      endTime: vexaMeeting?.end_time,
      startTime: vexaMeeting?.start_time ?? meeting.started_at,
    });
    if (result.updated) updated += 1;

    // Reaplica câmera enquanto gravando — virtual camera no Meet é intermitente.
    if (vexaStatus === "active" && meeting.status === "recording") {
      scheduleBotBranding(parsed.platform, nativeId, { skipWait: true, quickRetry: true });
    }

    const mappedStatus = mapVexaStatus(vexaStatus);
    if (mappedStatus === "completed" || mappedStatus === "failed") {
      try {
        await finalizeStoppedMeeting(admin, parsed.platform, nativeId, {
          endTime: vexaMeeting?.end_time ?? new Date().toISOString(),
          startTime: vexaMeeting?.start_time ?? meeting.started_at,
        });
        processed += 1;
      } catch (err) {
        console.error("Falha ao processar reunião (poll):", err);
      }
    }
  }

  return { tracked: meetings.length, updated, autoLeft, processed };
}
