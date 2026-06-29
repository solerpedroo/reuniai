import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { ingestMeetingTranscript } from "@/lib/pipeline/ingest-transcript";
import { analyzeMeetingById } from "@/lib/pipeline/analyze-meeting";

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
    .select("id, user_id, meeting_url, recall_bot_id")
    .eq("id", meetingId)
    .maybeSingle<{
      id: string;
      user_id: string;
      meeting_url: string | null;
      recall_bot_id: string | null;
    }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const parsed = meeting.meeting_url ? parseMeetingUrl(meeting.meeting_url) : null;
  if (!parsed || !meeting.recall_bot_id) {
    return NextResponse.json(
      { error: "Sem bot associado a esta reunião" },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const result = await ingestMeetingTranscript(admin, {
      meetingId: meeting.id,
      platform: parsed.platform,
      nativeMeetingId: meeting.recall_bot_id,
    });
    const analysis = await analyzeMeetingById(admin, meeting.id);
    return NextResponse.json({ ok: true, ...result, analysis: analysis.status });
  } catch (err) {
    console.error("Erro ao processar reunião:", err);
    return NextResponse.json({ error: "Falha ao processar reunião" }, { status: 500 });
  }
}
