import { NextResponse, type NextRequest } from "next/server";
import { resolveBotSessionStartedAt } from "@/lib/meetings/bot-session-time";
import { BOT_ACTIVE_STATUSES } from "@/lib/meetings/bot-lifecycle";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { finalizeStoppedMeeting } from "@/lib/vexa/finalize-meeting";
import { tryAutoLeaveEmptyMeeting } from "@/lib/vexa/auto-leave";
import { getMeetingSessionStatus } from "@/lib/vexa/session";
import { applyMeetingStatus, mapVexaStatus } from "@/lib/vexa/sync";
import type { Meeting } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type SessionMeeting = Pick<
  Meeting,
  | "id"
  | "user_id"
  | "status"
  | "recall_bot_id"
  | "meeting_url"
  | "started_at"
  | "bot_session_started_at"
>;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (isRateLimited({ key: `session:${user.id}`, ...RATE_LIMITS.session })) {
    const { error, status } = rateLimitResponse("Muitas consultas de sessão. Aguarde um instante.");
    return NextResponse.json({ error }, { status });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id, status, recall_bot_id, meeting_url, started_at, bot_session_started_at")
    .eq("id", id)
    .maybeSingle<SessionMeeting>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  if (meeting.status === "processing") {
    return NextResponse.json({ live: false, phase: "processing" });
  }

  if (!BOT_ACTIVE_STATUSES.has(meeting.status)) {
    return NextResponse.json({ live: false });
  }

  const parsed = meeting.meeting_url ? parseMeetingUrl(meeting.meeting_url) : null;
  const nativeMeetingId = meeting.recall_bot_id ?? parsed?.nativeMeetingId;
  const sessionStartedAt = resolveBotSessionStartedAt(meeting);

  if (!parsed || !nativeMeetingId) {
    return NextResponse.json({
      live: true,
      session: null,
      message: "Aguardando identificação do bot na reunião.",
    });
  }

  try {
    const admin = createAdminClient();
    const session = await getMeetingSessionStatus(
      parsed.platform,
      nativeMeetingId,
      sessionStartedAt,
      { meetingId: meeting.id, admin }
    );

    const lifecycleStatus = session.vexaStatus;
    let synced = false;

    if (
      meeting.status === "bot_joining" &&
      lifecycleStatus &&
      mapVexaStatus(lifecycleStatus) === "recording"
    ) {
      await applyMeetingStatus(admin, {
        nativeMeetingId,
        vexaStatus: lifecycleStatus,
        startTime: sessionStartedAt,
      });
      synced = true;
    }

    if (
      (meeting.status === "bot_joining" || meeting.status === "recording") &&
      lifecycleStatus === "failed"
    ) {
      await applyMeetingStatus(admin, {
        nativeMeetingId,
        vexaStatus: "failed",
        startTime: sessionStartedAt,
        reason: "O bot não conseguiu concluir a gravação.",
      });
      return NextResponse.json({ live: false, synced: true, session });
    }

    if (
      (meeting.status === "recording" || meeting.status === "bot_joining") &&
      session.containerRunning &&
      session.vexaStatus
    ) {
      const autoLeave = await tryAutoLeaveEmptyMeeting(admin, {
        meetingId: meeting.id,
        platform: parsed.platform,
        nativeMeetingId,
        vexaStatus: session.vexaStatus,
        meetingStartedAt: sessionStartedAt,
        vexaStartTime: session.vexaStartTime,
        containerUp: session.containerRunning,
        dbStatus: meeting.status,
      });
      if (autoLeave.autoLeft) {
        return NextResponse.json({ live: false, synced: true, session });
      }
    }

    const botDisconnected =
      !session.connected ||
      lifecycleStatus === "completed" ||
      lifecycleStatus === "failed";

    if (
      (meeting.status === "recording" || meeting.status === "bot_joining") &&
      botDisconnected
    ) {
      await finalizeStoppedMeeting(admin, parsed.platform, nativeMeetingId, {
        endTime: new Date().toISOString(),
        startTime: sessionStartedAt,
      });
      return NextResponse.json({ live: false, synced: true, session });
    }

    return NextResponse.json({ live: true, synced, session });
  } catch (err) {
    return NextResponse.json({
      live: true,
      session: null,
      message: err instanceof Error ? err.message : "Falha ao consultar o bot.",
    });
  }
}
