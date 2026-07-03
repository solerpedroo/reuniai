import "server-only";

import JSZip from "jszip";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Meeting, MeetingSummary, TranscriptSegment } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function buildAccountExportZip(
  admin: AdminClient,
  userId: string
): Promise<Buffer> {
  const zip = new JSZip();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  zip.file("profile.json", JSON.stringify(profile ?? {}, null, 2));

  const { data: meetings } = await admin
    .from("meetings")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: true });

  const meetingRows = (meetings ?? []) as Meeting[];
  const meetingIds = meetingRows.map((m) => m.id);

  zip.file("meetings/index.json", JSON.stringify(meetingRows, null, 2));

  if (meetingIds.length > 0) {
    const [summariesRes, segmentsRes, minutesRes, outcomesRes] = await Promise.all([
      admin.from("meeting_summaries").select("*").in("meeting_id", meetingIds),
      admin.from("transcript_segments").select("*").in("meeting_id", meetingIds),
      admin.from("meeting_minutes").select("*").in("meeting_id", meetingIds),
      admin.from("decision_outcomes").select("*").eq("user_id", userId),
    ]);

    const summariesByMeeting = new Map<string, MeetingSummary>();
    for (const row of summariesRes.data ?? []) {
      summariesByMeeting.set((row as MeetingSummary).meeting_id, row as MeetingSummary);
    }

    const segmentsByMeeting = new Map<string, TranscriptSegment[]>();
    for (const row of segmentsRes.data ?? []) {
      const segment = row as TranscriptSegment;
      const list = segmentsByMeeting.get(segment.meeting_id) ?? [];
      list.push(segment);
      segmentsByMeeting.set(segment.meeting_id, list);
    }

    const minutesByMeeting = new Map<string, unknown>();
    for (const row of minutesRes.data ?? []) {
      minutesByMeeting.set((row as { meeting_id: string }).meeting_id, row);
    }

    for (const meeting of meetingRows) {
      const folder = `meetings/${meeting.id}`;
      const summary = summariesByMeeting.get(meeting.id);
      if (summary) {
        zip.file(`${folder}/summary.json`, JSON.stringify(summary, null, 2));
      }

      const segments = (segmentsByMeeting.get(meeting.id) ?? []).sort(
        (a, b) => a.sequence - b.sequence
      );
      if (segments.length > 0) {
        const transcript = segments
          .map((s) => `[${s.start_ms}ms] ${s.speaker_label}: ${s.text}`)
          .join("\n");
        zip.file(`${folder}/transcript.txt`, transcript);
        zip.file(`${folder}/segments.json`, JSON.stringify(segments, null, 2));
      }

      const minutes = minutesByMeeting.get(meeting.id);
      if (minutes) {
        zip.file(`${folder}/minutes.json`, JSON.stringify(minutes, null, 2));
      }
    }

    zip.file("decision_outcomes.json", JSON.stringify(outcomesRes.data ?? [], null, 2));
  }

  zip.file(
    "README.txt",
    "Export LGPD ReuniAI — contém perfil, reuniões, transcrições, resumos e atas.\nGerado em " +
      new Date().toISOString()
  );

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export const EXPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function canExportAccount(
  admin: AdminClient,
  userId: string
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const { data: profile } = await admin
    .from("profiles")
    .select("last_account_export_at")
    .eq("id", userId)
    .maybeSingle<{ last_account_export_at: string | null }>();

  const last = profile?.last_account_export_at;
  if (!last) return { allowed: true };

  const elapsed = Date.now() - Date.parse(last);
  if (elapsed >= EXPORT_COOLDOWN_MS) return { allowed: true };

  return { allowed: false, retryAfterMs: EXPORT_COOLDOWN_MS - elapsed };
}

export async function markAccountExported(
  admin: AdminClient,
  userId: string
): Promise<void> {
  await admin
    .from("profiles")
    .update({ last_account_export_at: new Date().toISOString() })
    .eq("id", userId);
}
