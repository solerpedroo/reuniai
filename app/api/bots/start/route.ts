import { NextResponse, type NextRequest } from "next/server";
import type { Meeting } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isActionableBotJoinFailure,
  notifyBotJoinFailed,
} from "@/lib/notifications/bot-failed";
import { startBotForMeeting } from "@/lib/vexa/scheduler";
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
    .select(
      "id, user_id, title, meeting_url, status, platform, prefer_native_transcript, native_artifact_id, calendar_event_id"
    )
    .eq("id", meetingId)
    .maybeSingle<
      Pick<
        Meeting,
        | "id"
        | "user_id"
        | "title"
        | "meeting_url"
        | "status"
        | "platform"
        | "prefer_native_transcript"
        | "native_artifact_id"
        | "calendar_event_id"
      >
    >();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const admin = createAdminClient();
  const result = await startBotForMeeting(admin, meeting);

  if (!result.ok) {
    if (isActionableBotJoinFailure(result.reason)) {
      try {
        await notifyBotJoinFailed(admin, {
          userId: meeting.user_id,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          reason: result.reason,
        });
      } catch (err) {
        console.error("Falha ao notificar bot manual (não bloqueante):", err);
      }
    }
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
