import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { stopBot } from "@/lib/vexa/client";
import { finalizeStoppedMeeting } from "@/lib/vexa/finalize-meeting";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
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
    .select("id, user_id, meeting_url, recall_bot_id, started_at")
    .eq("id", meetingId)
    .maybeSingle<{
      id: string;
      user_id: string;
      meeting_url: string | null;
      recall_bot_id: string | null;
      started_at: string;
    }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const parsed = meeting.meeting_url ? parseMeetingUrl(meeting.meeting_url) : null;
  if (!parsed || !meeting.recall_bot_id) {
    return NextResponse.json({ error: "Bot não está ativo nesta reunião" }, { status: 400 });
  }

  try {
    await stopBot(parsed.platform, meeting.recall_bot_id);
  } catch (err) {
    console.error("Erro ao parar bot:", err);
    return NextResponse.json({ error: "Falha ao parar o bot" }, { status: 500 });
  }

  const admin = createAdminClient();
  await finalizeStoppedMeeting(admin, parsed.platform, meeting.recall_bot_id, {
    endTime: new Date().toISOString(),
    startTime: meeting.started_at,
  });

  return NextResponse.json({ ok: true });
}
