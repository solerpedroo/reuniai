import { NextResponse, type NextRequest } from "next/server";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getMeetingSessionStatus } from "@/lib/vexa/session";
import { applyMeetingStatus, mapVexaStatus } from "@/lib/vexa/sync";
import type { Meeting } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const LIVE_STATUSES = new Set<Meeting["status"]>(["bot_joining", "recording", "processing"]);

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

  if (!LIVE_STATUSES.has(meeting.status)) {
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
    const session = await getMeetingSessionStatus(parsed.platform, nativeMeetingId);

    // Sincroniza DB quando o Vexa já está ativo mas o status local ficou em "entrando".
    const lifecycleStatus = session.vexaStatus;
    if (
      meeting.status === "bot_joining" &&
      lifecycleStatus &&
      mapVexaStatus(lifecycleStatus) === "recording"
    ) {
      const admin = createAdminClient();
      await applyMeetingStatus(admin, {
        nativeMeetingId,
        vexaStatus: lifecycleStatus,
        startTime: meeting.started_at,
      });
    }

    return NextResponse.json({ live: true, session });
  } catch (err) {
    return NextResponse.json({
      live: true,
      session: null,
      message: err instanceof Error ? err.message : "Falha ao consultar o bot.",
    });
  }
}
