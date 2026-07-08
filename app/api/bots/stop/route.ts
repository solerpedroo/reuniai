import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { getRunningBots, stopBot } from "@/lib/vexa/client";
import { finalizeStoppedMeeting } from "@/lib/vexa/finalize-meeting";
import { isRateLimited, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (isRateLimited({ key: `bot:${user.id}`, ...RATE_LIMITS.bot })) {
    const { error, status } = rateLimitResponse("Muitas ações de bot em pouco tempo.");
    return NextResponse.json({ error }, { status });
  }

  let meetingId: string | undefined;
  try {
    const body = await request.json();
    meetingId = body?.meetingId;
  } catch {
    meetingId = undefined;
  }

  if (!meetingId) {
    return NextResponse.json({ error: "meetingId é obrigatório" }, { status: 400 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id, meeting_url, recall_bot_id, started_at, bot_session_started_at, status")
    .eq("id", meetingId)
    .maybeSingle<{
      id: string;
      user_id: string;
      meeting_url: string | null;
      recall_bot_id: string | null;
      started_at: string;
      bot_session_started_at: string | null;
      status: string;
    }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const parsed = meeting.meeting_url ? parseMeetingUrl(meeting.meeting_url) : null;
  if (!parsed || !meeting.recall_bot_id) {
    return NextResponse.json({ error: "Bot não está ativo nesta reunião" }, { status: 400 });
  }

  const activeStatuses = new Set(["bot_joining", "recording"]);
  const admin = createAdminClient();

  if (!activeStatuses.has(meeting.status)) {
    await finalizeStoppedMeeting(admin, parsed.platform, meeting.recall_bot_id, {
      endTime: new Date().toISOString(),
      startTime: meeting.started_at,
    });
    return NextResponse.json({ ok: true, alreadyStopped: true });
  }

  let botRunning = false;
  try {
    const running = await getRunningBots();
    botRunning = running.some((bot) => bot.native_meeting_id === meeting.recall_bot_id);
  } catch (err) {
    console.error("Erro ao consultar bots ativos:", err);
  }

  if (botRunning) {
    try {
      await stopBot(parsed.platform, meeting.recall_bot_id);
    } catch (err) {
      console.error("Erro ao parar bot:", err);
      return NextResponse.json({ error: "Falha ao parar o bot" }, { status: 500 });
    }
  }

  await finalizeStoppedMeeting(admin, parsed.platform, meeting.recall_bot_id, {
    endTime: new Date().toISOString(),
    startTime: meeting.bot_session_started_at ?? meeting.started_at,
  });

  return NextResponse.json({ ok: true, botWasRunning: botRunning });
}
