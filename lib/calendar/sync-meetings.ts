import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { detectPlatform } from "@/lib/calendar/platform";

type AdminClient = ReturnType<typeof createAdminClient>;

export type SyncResult = {
  scanned: number;
  withLink: number;
  inserted: number;
  updated: number;
};

export type CalendarMeetingCandidate = {
  calendarEventId: string;
  recurringEventId?: string | null;
  title: string;
  url: string;
  startedAt: string;
  endedAt: string | null;
  nativeArtifactId?: string | null;
  preferNativeTranscript?: boolean;
  attendees?: { name: string; email: string | null }[];
};

type ConnectionInput = {
  userId: string;
  connectionId: string;
};

export async function upsertMeetingsFromCalendar(
  admin: AdminClient,
  connection: ConnectionInput,
  scanned: number,
  candidates: CalendarMeetingCandidate[]
): Promise<SyncResult> {
  const eventIds = candidates.map((c) => c.calendarEventId);

  const existingByEventId = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: existing, error } = await admin
      .from("meetings")
      .select("id, calendar_event_id")
      .eq("user_id", connection.userId)
      .in("calendar_event_id", eventIds);

    if (error) throw error;
    for (const row of existing ?? []) {
      if (row.calendar_event_id) existingByEventId.set(row.calendar_event_id, row.id);
    }
  }

  const toInsert: TablesInsert<"meetings">[] = [];
  let updated = 0;

  for (const candidate of candidates) {
    const title = candidate.title.trim() || "Reunião sem título";
    const platform = detectPlatform(candidate.url);
    const existingId = existingByEventId.get(candidate.calendarEventId);

    const artifactFields = {
      native_artifact_id: candidate.nativeArtifactId ?? null,
      prefer_native_transcript: candidate.preferNativeTranscript ?? false,
    };

    if (existingId) {
      const { error } = await admin
        .from("meetings")
        .update({
          title,
          started_at: candidate.startedAt,
          ended_at: candidate.endedAt,
          platform,
          meeting_url: candidate.url,
          calendar_recurring_event_id: candidate.recurringEventId ?? null,
          ...artifactFields,
        })
        .eq("id", existingId);
      if (error) throw error;
      updated += 1;
    } else {
      toInsert.push({
        user_id: connection.userId,
        calendar_event_id: candidate.calendarEventId,
        calendar_recurring_event_id: candidate.recurringEventId ?? null,
        title,
        started_at: candidate.startedAt,
        ended_at: candidate.endedAt,
        platform,
        meeting_url: candidate.url,
        status: "scheduled",
        ...artifactFields,
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await admin.from("meetings").insert(toInsert);
    if (error) throw error;
  }

  await syncParticipantsForMeetings(admin, connection.userId, candidates);

  await admin
    .from("calendar_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.connectionId);

  return {
    scanned,
    withLink: candidates.length,
    inserted: toInsert.length,
    updated,
  };
}

async function syncParticipantsForMeetings(
  admin: AdminClient,
  userId: string,
  candidates: CalendarMeetingCandidate[]
): Promise<void> {
  const eventIds = candidates.map((c) => c.calendarEventId);
  if (eventIds.length === 0) return;

  const { data: meetings, error } = await admin
    .from("meetings")
    .select("id, calendar_event_id")
    .eq("user_id", userId)
    .in("calendar_event_id", eventIds);

  if (error) throw error;

  const meetingByEventId = new Map(
    ((meetings ?? []) as { id: string; calendar_event_id: string | null }[])
      .filter((m) => m.calendar_event_id)
      .map((m) => [m.calendar_event_id!, m.id])
  );

  for (const candidate of candidates) {
    const meetingId = meetingByEventId.get(candidate.calendarEventId);
    if (!meetingId || !candidate.attendees?.length) continue;

    await admin.from("participants").delete().eq("meeting_id", meetingId);

    const rows = candidate.attendees.map((attendee) => ({
      meeting_id: meetingId,
      name: attendee.name,
      email: attendee.email,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await admin.from("participants").insert(rows);
      if (insertError) console.error("Falha ao sincronizar participantes:", insertError);
    }
  }
}
