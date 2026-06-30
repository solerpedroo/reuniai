import { NextResponse, type NextRequest } from "next/server";
import { resolveMeetingRecording } from "@/lib/meetings/resolve-recording";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchRecordingMediaRaw } from "@/lib/vexa/client";
import type { Meeting } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
] as const;

export async function GET(
  request: NextRequest,
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

  if (!resolved || resolved.source !== "proxy" || !resolved.vexaRef) {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
  }

  const range = request.headers.get("range");
  const vexaResponse = await fetchRecordingMediaRaw(
    resolved.vexaRef.recordingId,
    resolved.vexaRef.mediaFileId,
    range ? { Range: range } : undefined
  );

  if (!vexaResponse.ok && vexaResponse.status !== 206) {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: vexaResponse.status === 401 ? 502 : 404 });
  }

  const headers = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = vexaResponse.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "private, no-store");

  return new Response(vexaResponse.body, {
    status: vexaResponse.status,
    headers,
  });
}
