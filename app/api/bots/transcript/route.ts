import { after, NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { analyzeMeetingById } from "@/lib/pipeline/analyze-meeting";
import {
  ingestMeetingWithFallback,
  TranscriptUnavailableError,
} from "@/lib/pipeline/ingest-fallback";
import { isRateLimited, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (isRateLimited({ key: `transcript-reprocess:${user.id}`, ...RATE_LIMITS.transcriptReprocess })) {
    const { error, status } = rateLimitResponse("Muitos reprocessamentos em pouco tempo.");
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
    const result = await ingestMeetingWithFallback(admin, meeting.id);

    if (result.segments === 0) {
      return NextResponse.json(
        { error: "Nenhum trecho disponível ainda no provedor de transcrição." },
        { status: 422 }
      );
    }

    after(async () => {
      try {
        await analyzeMeetingById(admin, meeting.id);
      } catch (err) {
        console.error("Análise em background após ingestão manual:", err);
      }
    });

    return NextResponse.json({
      ok: true,
      ...result,
      analysis: "scheduled",
    });
  } catch (err) {
    console.error("Erro ao processar reunião:", err);

    if (err instanceof TranscriptUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }

    const message =
      err instanceof Error ? err.message.slice(0, 500) : "Falha ao processar reunião";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
