import { NextResponse, type NextRequest } from "next/server";
import { resolveRecordingPlaybackUrl } from "@/lib/meetings/recording-playback-url";
import { resolveMeetingRecording } from "@/lib/meetings/resolve-recording";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, user_id, recording_path, recall_bot_id, meeting_url, duration_ms")
    .eq("id", id)
    .maybeSingle<
      Pick<
        Meeting,
        "id" | "user_id" | "recording_path" | "recall_bot_id" | "meeting_url" | "duration_ms"
      >
    >();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const admin = createAdminClient();
  const resolved = await resolveMeetingRecording(admin, meeting);

  if (!resolved) {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
  }

  const playback = await resolveRecordingPlaybackUrl(admin, id, resolved);
  if (!playback) {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
  }

  return NextResponse.json({
    source: resolved.source,
    delivery: playback.delivery,
    url: playback.url,
    contentType: playback.contentType,
    durationSeconds:
      resolved.durationSeconds ??
      (meeting.duration_ms && meeting.duration_ms > 0
        ? meeting.duration_ms / 1000
        : null),
  });
}
