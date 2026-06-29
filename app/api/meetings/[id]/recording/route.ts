import { NextResponse, type NextRequest } from "next/server";
import { RECORDINGS_BUCKET, resolveRecordingPath } from "@/lib/meetings/recording";
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
    .select("id, user_id, recording_path")
    .eq("id", id)
    .maybeSingle<Pick<Meeting, "id" | "user_id" | "recording_path">>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const path = resolveRecordingPath(meeting);
  const { data, error } = await supabase.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
