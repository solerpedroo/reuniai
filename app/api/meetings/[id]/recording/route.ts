import { NextResponse, type NextRequest } from "next/server";
import { RECORDINGS_BUCKET, resolveRecordingPath } from "@/lib/meetings/recording";
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
    .select("id, user_id, recording_path, recall_bot_id, meeting_url")
    .eq("id", id)
    .maybeSingle<Pick<Meeting, "id" | "user_id" | "recording_path" | "recall_bot_id" | "meeting_url">>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const admin = createAdminClient();
  const resolved = await resolveMeetingRecording(admin, meeting);

  if (!resolved) {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
  }

  if (resolved.source === "proxy") {
    return NextResponse.json({
      source: "proxy",
      url: `/api/meetings/${id}/recording/stream`,
      contentType: resolved.contentType ?? "audio/wav",
      durationSeconds: resolved.durationSeconds ?? null,
    });
  }

  const path = resolved.storagePath ?? resolveRecordingPath(meeting);
  const { data, error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
  }

  return NextResponse.json({
    source: "supabase",
    url: data.signedUrl,
    contentType: "audio/mp4",
    durationSeconds: null,
  });
}
