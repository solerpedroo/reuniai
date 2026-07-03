import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { redactText } from "@/lib/privacy/redact";
import type { Meeting, TranscriptSegment } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export type MeetingClipRow = {
  id: string;
  user_id: string;
  meeting_id: string;
  highlight_id: string | null;
  token: string;
  caption: string;
  start_ms: number;
  end_ms: number | null;
  expires_at: string;
  revoked_at: string | null;
  redact_pii: boolean;
  created_at: string;
};

export type ResolvedClip = {
  clip: MeetingClipRow;
  meeting: Pick<Meeting, "id" | "title" | "started_at">;
  segments: TranscriptSegment[];
  caption: string;
};

const DEFAULT_CLIP_DAYS = 7;

export async function createMeetingClip(
  admin: AdminClient,
  input: {
    userId: string;
    meetingId: string;
    highlightId: string;
    caption: string;
    startMs: number;
    endMs?: number | null;
    days?: number;
    redactPii?: boolean;
  }
): Promise<{ clip: MeetingClipRow; url: string }> {
  const days = Math.min(Math.max(input.days ?? DEFAULT_CLIP_DAYS, 1), 30);
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  const redactPii = input.redactPii !== false;
  const rawCaption = input.caption.trim();
  const caption = redactPii ? redactText(rawCaption).text : rawCaption;

  const { data, error } = await admin
    .from("meeting_clips")
    .insert({
      user_id: input.userId,
      meeting_id: input.meetingId,
      highlight_id: input.highlightId,
      caption,
      start_ms: input.startMs,
      end_ms: input.endMs ?? null,
      expires_at: expiresAt,
      redact_pii: redactPii,
    })
    .select("*")
    .single<MeetingClipRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao criar clip");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return { clip: data, url: `${appUrl}/c/${data.token}` };
}

export async function resolveMeetingClip(
  admin: AdminClient,
  token: string
): Promise<ResolvedClip | null> {
  const { data: clip, error } = await admin
    .from("meeting_clips")
    .select("*")
    .eq("token", token)
    .maybeSingle<MeetingClipRow>();

  if (error || !clip) return null;
  if (clip.revoked_at) return null;
  if (Date.parse(clip.expires_at) < Date.now()) return null;

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, title, started_at")
    .eq("id", clip.meeting_id)
    .maybeSingle<Pick<Meeting, "id" | "title" | "started_at">>();

  if (!meeting) return null;

  const windowStart = Math.max(0, clip.start_ms - 30_000);
  const windowEnd = (clip.end_ms ?? clip.start_ms + 60_000) + 30_000;

  const { data: segments } = await admin
    .from("transcript_segments")
    .select("*")
    .eq("meeting_id", clip.meeting_id)
    .gte("start_ms", windowStart)
    .lte("start_ms", windowEnd)
    .order("sequence", { ascending: true });

  let caption = clip.caption;
  const segmentRows = (segments ?? []) as TranscriptSegment[];

  if (clip.redact_pii) {
    caption = redactText(caption).text;
    for (const segment of segmentRows) {
      segment.text = redactText(segment.text).text;
      segment.speaker_label = redactText(segment.speaker_label).text;
    }
  }

  return {
    clip,
    meeting,
    segments: segmentRows,
    caption,
  };
}

export async function revokeMeetingClip(
  admin: AdminClient,
  userId: string,
  clipId: string
): Promise<boolean> {
  const { error } = await admin
    .from("meeting_clips")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", clipId)
    .eq("user_id", userId);

  return !error;
}

export async function extendMeetingClip(
  admin: AdminClient,
  userId: string,
  clipId: string,
  days: number
): Promise<boolean> {
  const safeDays = Math.min(Math.max(days, 1), 30);
  const expiresAt = new Date(Date.now() + safeDays * 86_400_000).toISOString();

  const { error } = await admin
    .from("meeting_clips")
    .update({ expires_at: expiresAt, revoked_at: null })
    .eq("id", clipId)
    .eq("user_id", userId);

  return !error;
}
