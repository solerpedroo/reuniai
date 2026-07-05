import { NextResponse, type NextRequest } from "next/server";
import { RECORDINGS_BUCKET } from "@/lib/meetings/recording";
import { resolveMeetingRecording } from "@/lib/meetings/resolve-recording";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchRecordingMediaRaw } from "@/lib/vexa/client";
import type { Meeting } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const FORWARD_RESPONSE_HEADERS = [
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

  if (!resolved) {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
  }

  const range = request.headers.get("range");
  const rangeHeaders = range ? { Range: range } : undefined;

  let mediaResponse: Response;
  let contentType = resolved.contentType ?? "audio/wav";

  if (resolved.source === "proxy" && resolved.vexaRef) {
    mediaResponse = await fetchRecordingMediaRaw(
      resolved.vexaRef.recordingId,
      resolved.vexaRef.mediaFileId,
      rangeHeaders
    );
    const upstreamType = mediaResponse.headers.get("content-type");
    if (upstreamType) contentType = upstreamType;
  } else if (resolved.source === "supabase" && resolved.storagePath) {
    const { data: signed, error: signError } = await admin.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(resolved.storagePath, 60 * 60);

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
    }

    mediaResponse = await fetch(signed.signedUrl, {
      headers: rangeHeaders,
      cache: "no-store",
    });
  } else {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
  }

  if (!mediaResponse.ok && mediaResponse.status !== 206) {
    return NextResponse.json(
      { error: "Gravação não disponível" },
      { status: mediaResponse.status === 401 ? 502 : 404 }
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);

  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = mediaResponse.headers.get(name);
    if (value) headers.set(name, value);
  }

  headers.set("Cache-Control", "private, no-store");

  return new Response(mediaResponse.body, {
    status: mediaResponse.status,
    headers,
  });
}
