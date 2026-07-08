import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { resolveBotSessionStartedAt } from "@/lib/meetings/bot-session-time";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { stopBot, getTranscript } from "@/lib/vexa/client";
import { tryAutoLeaveEmptyMeeting } from "@/lib/vexa/auto-leave";
import {
  finalizeStoppedMeeting,
  retryStuckMeetingTranscripts,
} from "@/lib/vexa/finalize-meeting";
import {
  getRunningBotsByNativeId,
  getVexaMeetingsByNativeId,
  refineVexaMeetingStatus,
  resolveVexaMeetingStatus,
} from "@/lib/vexa/meeting-state";
import { applyMeetingStatus, mapVexaStatus } from "@/lib/vexa/sync";
import { scheduleBotBranding } from "@/lib/vexa/branding";
import type { VexaMeeting } from "@/lib/vexa/client";

type AdminClient = ReturnType<typeof createAdminClient>;

export type PollMeetingsSummary = {
  tracked: number;
  updated: number;
  autoLeft: number;
  processed: number;
  retried: number;
};

function meetingKey(platform: string, nativeMeetingId: string): string {
  return `${platform}:${nativeMeetingId}`;
}

function resolvePollFailureReason(
  vexaMeeting: VexaMeeting | null | undefined,
  vexaStatus: string
): string | null {
  if (vexaStatus !== "failed") return null;

  const data = vexaMeeting?.data;
  if (data && typeof data === "object") {
    for (const key of ["reason", "error", "failure_reason", "message"] as const) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return "O bot encerrou com falha no provedor de transcrição.";
}

async function tryFinalizeStoppedMeeting(
  admin: AdminClient,
  platform: BotPlatform,
  nativeId: string,
  options: { endTime?: string; startTime?: string | null }
): Promise<boolean> {
  try {
    await finalizeStoppedMeeting(admin, platform, nativeId, options);
    return true;
  } catch (err) {
    console.error("Falha ao processar reunião (poll):", err);
    return false;
  }
}

/**
 * Sincroniza status das reuniões ativas com o Vexa, encerra bots em salas vazias
 * e dispara o pipeline quando a reunião termina.
 */
export async function pollActiveMeetings(admin: AdminClient): Promise<PollMeetingsSummary> {
  const { data: meetings } = await admin
    .from("meetings")
    .select("id, recall_bot_id, meeting_url, status, started_at, bot_session_started_at")
    .in("status", ["bot_joining", "recording", "processing"])
    .not("recall_bot_id", "is", null);

  if (!meetings || meetings.length === 0) {
    const { retried } = await retryStuckMeetingTranscripts(admin);
    return { tracked: 0, updated: 0, autoLeft: 0, processed: 0, retried };
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

    let hasTranscriptSegments = false;
    if (!vexaMeeting || meeting.status === "bot_joining") {
      try {
        const transcript = await getTranscript(parsed.platform, nativeId);
        hasTranscriptSegments = (transcript.segments?.length ?? 0) > 0;
      } catch {
        hasTranscriptSegments = false;
      }
    }

    const sessionStartedAt = resolveBotSessionStartedAt(meeting);

    let vexaStatus = resolveVexaMeetingStatus({
      vexaMeeting,
      container,
      dbStatus: meeting.status,
      meetingStartedAt: sessionStartedAt,
      hasTranscriptSegments,
    });

    const elapsedMs = Date.now() - new Date(sessionStartedAt).getTime();
    vexaStatus = await refineVexaMeetingStatus(
      parsed.platform,
      nativeId,
      vexaStatus,
      Boolean(container?.containerUp),
      elapsedMs
    );

    const finalizeOptions = {
      endTime: vexaMeeting?.end_time ?? new Date().toISOString(),
      startTime: vexaMeeting?.start_time ?? sessionStartedAt,
    };
    const mappedStatus = mapVexaStatus(vexaStatus);
    const isLiveBot = meeting.status === "recording" || meeting.status === "bot_joining";

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
    if (isLiveBot) {
      const autoLeave = await tryAutoLeaveEmptyMeeting(admin, {
        meetingId: meeting.id,
        platform: parsed.platform,
        nativeMeetingId: nativeId,
        vexaStatus,
        meetingStartedAt: sessionStartedAt,
        vexaStartTime: vexaMeeting?.start_time,
        containerUp: Boolean(container?.containerUp),
        dbStatus: meeting.status,
      });
      if (autoLeave.autoLeft) {
        autoLeft += 1;
        processed += 1;
        continue;
      }
    }

    // Finaliza antes de applyMeetingStatus quando o bot encerra — mesmo fluxo do webhook.
    if (isLiveBot && mappedStatus === "completed") {
      if (await tryFinalizeStoppedMeeting(admin, parsed.platform, nativeId, finalizeOptions)) {
        processed += 1;
      }
      continue;
    }

    if (isLiveBot && mappedStatus === "failed") {
      if (await tryFinalizeStoppedMeeting(admin, parsed.platform, nativeId, finalizeOptions)) {
        processed += 1;
      }

      const result = await applyMeetingStatus(admin, {
        nativeMeetingId: nativeId,
        vexaStatus,
        endTime: vexaMeeting?.end_time,
        startTime: vexaMeeting?.start_time ?? sessionStartedAt,
        reason:
          meeting.status === "bot_joining"
            ? resolvePollFailureReason(vexaMeeting, vexaStatus) ??
              "O bot não conseguiu entrar na reunião a tempo."
            : resolvePollFailureReason(vexaMeeting, vexaStatus),
      });
      if (result.updated) updated += 1;

      if (container?.containerUp) {
        try {
          await stopBot(parsed.platform, nativeId);
          autoLeft += 1;
        } catch (err) {
          console.error("Falha ao remover bot após falha de entrada:", err);
        }
      }
      continue;
    }

    const result = await applyMeetingStatus(admin, {
      nativeMeetingId: nativeId,
      vexaStatus,
      endTime: vexaMeeting?.end_time,
      startTime: vexaMeeting?.start_time ?? sessionStartedAt,
      reason:
        vexaStatus === "failed" && meeting.status === "bot_joining"
          ? resolvePollFailureReason(vexaMeeting, vexaStatus) ??
            "O bot não conseguiu entrar na reunião a tempo."
          : resolvePollFailureReason(vexaMeeting, vexaStatus),
    });
    if (result.updated) updated += 1;

    // Reaplica câmera enquanto gravando — virtual camera no Meet é intermitente.
    if (vexaStatus === "active" && isLiveBot) {
      scheduleBotBranding(parsed.platform, nativeId, { skipWait: true, quickRetry: true });
    }

    if (vexaStatus === "failed" && container?.containerUp) {
      try {
        await stopBot(parsed.platform, nativeId);
        autoLeft += 1;
      } catch (err) {
        console.error("Falha ao remover bot após falha de entrada:", err);
      }
    }

    if (mappedStatus === "completed" || mappedStatus === "failed") {
      if (await tryFinalizeStoppedMeeting(admin, parsed.platform, nativeId, finalizeOptions)) {
        processed += 1;
      }
    }
  }

  const { retried } = await retryStuckMeetingTranscripts(admin);

  return { tracked: meetings.length, updated, autoLeft, processed, retried };
}
