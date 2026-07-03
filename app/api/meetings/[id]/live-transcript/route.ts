import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchLiveTranscript } from "@/lib/meetings/live-transcript";
import { getLiveElapsedMs, isLiveMeetingStatus } from "@/lib/meetings/live-elapsed";
import { isRateLimited, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
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

  if (isRateLimited({ key: `live-transcript:${user.id}`, limit: 30, windowMs: 60_000 })) {
    const { error, status } = rateLimitResponse("Muitas consultas ao vivo. Aguarde um instante.");
    return NextResponse.json({ error }, { status });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id, status, meeting_url, recall_bot_id, started_at")
    .eq("id", id)
    .maybeSingle<
      Pick<
        Meeting,
        "id" | "user_id" | "status" | "meeting_url" | "recall_bot_id" | "started_at"
      >
    >();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  if (!isLiveMeetingStatus(meeting.status)) {
    return NextResponse.json({ error: "Reunião não está ao vivo" }, { status: 409 });
  }

  try {
    const payload = await fetchLiveTranscript({
      meetingUrl: meeting.meeting_url,
      recallBotId: meeting.recall_bot_id,
      meetingStartedAt: meeting.started_at,
    });

    return NextResponse.json({
      ...payload,
      elapsed_ms: getLiveElapsedMs(meeting.started_at),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao buscar transcrição ao vivo" },
      { status: 502 }
    );
  }
}
