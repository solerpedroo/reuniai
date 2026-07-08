import { NextResponse, type NextRequest } from "next/server";
import { analyzeMeetingById } from "@/lib/pipeline/analyze-meeting";
import {
  ingestMeetingWithFallback,
  TranscriptUnavailableError,
} from "@/lib/pipeline/ingest-fallback";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const END_BUFFER_MS = 10 * 60_000;
const MAX_AGE_MS = 24 * 60 * 60_000;
const VEXA_RETRY_MIN_AGE_MS = 2 * 60_000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const cutoffStart = new Date(now - MAX_AGE_MS).toISOString();

  const { data: meetings, error } = await admin
    .from("meetings")
    .select(
      "id, user_id, platform, started_at, ended_at, prefer_native_transcript, native_artifact_id, recall_bot_id, status"
    )
    .in("status", ["scheduled", "recording", "bot_joining", "processing", "completed", "partial"])
    .gte("started_at", cutoffStart)
    .or(
      "prefer_native_transcript.eq.true,and(platform.eq.teams,native_artifact_id.not.is.null),and(recall_bot_id.not.is.null,ended_at.not.is.null)"
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const meeting of meetings ?? []) {
    const endMs = meeting.ended_at
      ? new Date(meeting.ended_at).getTime()
      : new Date(meeting.started_at).getTime() + 60 * 60_000;

    const endBufferMs = meeting.recall_bot_id ? VEXA_RETRY_MIN_AGE_MS : END_BUFFER_MS;
    if (endMs + endBufferMs > now) {
      skipped += 1;
      continue;
    }

    const { count } = await admin
      .from("transcript_segments")
      .select("id", { count: "exact", head: true })
      .eq("meeting_id", meeting.id);

    if ((count ?? 0) > 0) {
      skipped += 1;
      continue;
    }

    try {
      const ingest = await ingestMeetingWithFallback(admin, meeting.id);
      if (ingest.segments > 0) {
        await analyzeMeetingById(admin, meeting.id);
        processed += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      if (err instanceof TranscriptUnavailableError) {
        skipped += 1;
      } else {
        console.error(`Falha ao ingerir nativo ${meeting.id}:`, err);
        failed += 1;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: meetings?.length ?? 0,
    processed,
    skipped,
    failed,
  });
}
