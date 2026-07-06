import { NextResponse, type NextRequest } from "next/server";
import { RECORDINGS_BUCKET } from "@/lib/meetings/recording";
import {
  resolveMeetingRecording,
  type ResolvedRecording,
} from "@/lib/meetings/resolve-recording";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchRecordingMediaRaw } from "@/lib/vexa/client";
import type { Meeting } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const FORWARD_RESPONSE_HEADERS = [
  "content-length",
  "content-range",
  "accept-ranges",
  "content-disposition",
] as const;

type AdminClient = ReturnType<typeof createAdminClient>;

async function fetchResolvedRecordingMedia(
  resolved: ResolvedRecording,
  admin: AdminClient,
  rangeHeaders?: HeadersInit
): Promise<Response> {
  if (resolved.source === "proxy" && resolved.vexaRef) {
    return fetchRecordingMediaRaw(
      resolved.vexaRef.recordingId,
      resolved.vexaRef.mediaFileId,
      rangeHeaders
    );
  }

  if (resolved.source === "supabase" && resolved.storagePath) {
    const { data: signed, error: signError } = await admin.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(resolved.storagePath, 60 * 60);

    if (signError || !signed?.signedUrl) {
      return new Response(null, { status: 404 });
    }

    return fetch(signed.signedUrl, {
      headers: rangeHeaders,
      cache: "no-store",
    });
  }

  return new Response(null, { status: 404 });
}

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
  let resolved = await resolveMeetingRecording(admin, meeting);

  if (!resolved) {
    return NextResponse.json({ error: "Gravação não disponível" }, { status: 404 });
  }

  const range = request.headers.get("range");
  const rangeHeaders = range ? { Range: range } : undefined;

  let mediaResponse = await fetchResolvedRecordingMedia(resolved, admin, rangeHeaders);

  if (!mediaResponse.ok && mediaResponse.status !== 206 && resolved.source === "proxy") {
    const refreshed = await resolveMeetingRecording(admin, meeting, { forceRefresh: true });
    if (refreshed?.vexaRef) {
      resolved = refreshed;
      mediaResponse = await fetchResolvedRecordingMedia(refreshed, admin, rangeHeaders);
    }
  }

  let contentType = resolved.contentType ?? "audio/wav";

  if (!mediaResponse.ok && mediaResponse.status !== 206) {
    return NextResponse.json(
      { error: "Gravação não disponível" },
      { status: mediaResponse.status === 401 ? 502 : 404 }
    );
  }

  const upstreamType = mediaResponse.headers.get("content-type");
  if (upstreamType) contentType = upstreamType;

  const headers = new Headers();
  headers.set("Content-Type", contentType);

  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = mediaResponse.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (!headers.has("accept-ranges") && (mediaResponse.status === 200 || mediaResponse.status === 206)) {
    headers.set("Accept-Ranges", "bytes");
  }

  headers.set("Cache-Control", "private, no-store");

  return new Response(mediaResponse.body, {
    status: mediaResponse.status,
    headers,
  });
}
