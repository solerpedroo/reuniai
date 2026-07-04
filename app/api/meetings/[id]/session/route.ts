import { NextResponse, type NextRequest } from "next/server";
import { BOT_ACTIVE_STATUSES } from "@/lib/meetings/bot-lifecycle";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { finalizeStoppedMeeting } from "@/lib/vexa/finalize-meeting";
import { tryAutoLeaveEmptyMeeting } from "@/lib/vexa/auto-leave";
import { getMeetingSessionStatus } from "@/lib/vexa/session";
import { applyMeetingStatus, mapVexaStatus } from "@/lib/vexa/sync";
import type { Meeting } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

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

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id, status, recall_bot_id, meeting_url, started_at")
    .eq("id", id)
    .maybeSingle<
      Pick<Meeting, "id" | "user_id" | "status" | "recall_bot_id" | "meeting_url" | "started_at">
    >();

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

  if (!parsed || !nativeMeetingId) {
    return NextResponse.json({
      live: true,
      session: null,
      message: "Aguardando identificação do bot na reunião.",
    });
  }

  try {
    const session = await getMeetingSessionStatus(
      parsed.platform,
      nativeMeetingId,
      meeting.started_at
    );

    const admin = createAdminClient();
    const lifecycleStatus = session.vexaStatus;
    let synced = false;

    // Vexa já ativo mas DB ainda em "entrando".
    if (
      meeting.status === "bot_joining" &&
      lifecycleStatus &&
      mapVexaStatus(lifecycleStatus) === "recording"
    ) {
      await applyMeetingStatus(admin, {
        nativeMeetingId,
        vexaStatus: lifecycleStatus,
        startTime: meeting.started_at,
      });
      synced = true;
    }

    // Falha de entrada reportada pelo Vexa.
    if (
      (meeting.status === "bot_joining" || meeting.status === "recording") &&
      lifecycleStatus === "failed"
    ) {
      await applyMeetingStatus(admin, {
        nativeMeetingId,
        vexaStatus: "failed",
        startTime: meeting.started_at,
        reason: "O bot não conseguiu concluir a gravação.",
      });
      return NextResponse.json({ live: false, synced: true, session });
    }

    // Sala vazia com bot ainda na call — encerra sem esperar o cron de 5 min.
    if (
      (meeting.status === "recording" || meeting.status === "bot_joining") &&
      session.connected &&
      session.vexaStatus
    ) {
      const autoLeave = await tryAutoLeaveEmptyMeeting(admin, {
        platform: parsed.platform,
        nativeMeetingId,
        vexaStatus: session.vexaStatus,
        meetingStartedAt: meeting.started_at,
        containerUp: true,
        dbStatus: meeting.status,
      });
      if (autoLeave.autoLeft) {
        return NextResponse.json({ live: false, synced: true, session });
      }
    }

    // Bot saiu (container down) mas DB ainda indica bot ativo.
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
        startTime: meeting.started_at,
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
