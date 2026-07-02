import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import {
  assigneeMatchesParticipant,
  normalizeEmail,
  participantKey,
} from "@/lib/participants/normalize";
import { truncateNotePreview } from "@/lib/participants/notes";
import type { ActionItem, Meeting } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

export type MeetingParticipantContext = {
  subtitle: string | null;
  noteSnippets: string[];
};

function daysSince(iso: string, now = new Date()): number {
  const diffMs = now.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function formatDaysAgo(days: number): string {
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

export async function getMeetingParticipantContexts(
  supabase: Client,
  meetingIds: string[],
  options: { now?: Date } = {}
): Promise<Map<string, MeetingParticipantContext>> {
  const result = new Map<string, MeetingParticipantContext>();
  if (meetingIds.length === 0) return result;

  const now = options.now ?? new Date();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return result;

  const [participantsRes, notesRes, openTasksRes, pastMeetingsRes] = await Promise.all([
    supabase
      .from("participants")
      .select("meeting_id, name, email")
      .in("meeting_id", meetingIds),
    supabase
      .from("participant_notes")
      .select("participant_key, body")
      .eq("user_id", user.id),
    supabase
      .from("action_items")
      .select("title, assignee, status, meeting_id")
      .eq("status", "open"),
    supabase
      .from("meetings")
      .select("id, started_at")
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(100),
  ]);

  if (participantsRes.error) throw participantsRes.error;

  const pastMeetingIds = (pastMeetingsRes.data ?? []).map(
    (row) => (row as Pick<Meeting, "id">).id
  );

  const { data: pastParticipantsRes } =
    pastMeetingIds.length > 0
      ? await supabase
          .from("participants")
          .select("meeting_id, name, email")
          .in("meeting_id", pastMeetingIds)
      : { data: [] };

  const notesByKey = new Map<string, string>();
  for (const row of notesRes.data ?? []) {
    const note = row as { participant_key: string; body: string };
    if (note.body.trim()) notesByKey.set(note.participant_key, note.body);
  }

  const openTasks = (openTasksRes.data ?? []) as Pick<
    ActionItem,
    "title" | "assignee" | "status" | "meeting_id"
  >[];

  const pastParticipantsByMeeting = new Map<string, { name: string; email: string | null }[]>();
  for (const row of pastParticipantsRes ?? []) {
    const typed = row as { meeting_id: string; name: string; email: string | null };
    const list = pastParticipantsByMeeting.get(typed.meeting_id) ?? [];
    list.push({ name: typed.name, email: typed.email });
    pastParticipantsByMeeting.set(typed.meeting_id, list);
  }

  const participantsByMeeting = new Map<
    string,
    { name: string; email: string | null; key: string }[]
  >();

  for (const row of participantsRes.data ?? []) {
    const typed = row as { meeting_id: string; name: string; email: string | null };
    const list = participantsByMeeting.get(typed.meeting_id) ?? [];
    list.push({
      name: typed.name,
      email: typed.email,
      key: participantKey(typed.email, typed.name),
    });
    participantsByMeeting.set(typed.meeting_id, list);
  }

  for (const meetingId of meetingIds) {
    const participants = participantsByMeeting.get(meetingId) ?? [];
    if (participants.length === 0) {
      result.set(meetingId, { subtitle: null, noteSnippets: [] });
      continue;
    }

    const participantEmails = participants
      .map((p) => normalizeEmail(p.email))
      .filter((e): e is string => Boolean(e));

    let openTaskCount = 0;
    for (const task of openTasks) {
      if (
        participants.some((p) =>
          assigneeMatchesParticipant(task.assignee, p.name, p.email)
        )
      ) {
        openTaskCount += 1;
      }
    }

    let lastMeetingAt: string | null = null;
    for (const past of pastMeetingsRes.data ?? []) {
      const pastMeeting = past as Pick<Meeting, "id" | "started_at">;
      if (pastMeeting.id === meetingId) continue;
      const pastParticipants = pastParticipantsByMeeting.get(pastMeeting.id) ?? [];
      const pastEmails = pastParticipants
        .map((p) => normalizeEmail(p.email))
        .filter((e): e is string => Boolean(e));
      const overlap =
        participantEmails.length > 0
          ? participantEmails.some((email) => pastEmails.includes(email))
          : pastParticipants.some((p) =>
              participants.some((cp) => cp.name.toLowerCase() === p.name.toLowerCase())
            );
      if (overlap) {
        lastMeetingAt = pastMeeting.started_at;
        break;
      }
    }

    const noteSnippets = participants
      .map((p) => notesByKey.get(p.key))
      .filter((body): body is string => Boolean(body?.trim()))
      .slice(0, 2)
      .map((body) => truncateNotePreview(body, 60));

    const parts: string[] = [];
    if (openTaskCount > 0) {
      parts.push(
        `${openTaskCount} tarefa${openTaskCount === 1 ? "" : "s"} aberta${openTaskCount === 1 ? "" : "s"} com participantes`
      );
    }
    if (lastMeetingAt) {
      parts.push(`última call ${formatDaysAgo(daysSince(lastMeetingAt, now))}`);
    }
    if (noteSnippets.length > 0) {
      parts.push("tem notas salvas");
    }

    result.set(meetingId, {
      subtitle: parts.length > 0 ? parts.join(" · ") : null,
      noteSnippets,
    });
  }

  return result;
}

export async function getParticipantNoteSnippetsForPrep(
  admin: AdminClient,
  userId: string,
  participantKeys: string[]
): Promise<string[]> {
  if (participantKeys.length === 0) return [];

  const { data } = await admin
    .from("participant_notes")
    .select("participant_key, body")
    .eq("user_id", userId)
    .in("participant_key", participantKeys);

  return (data ?? [])
    .map((row) => row as { body: string })
    .map((row) => row.body.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((body) => truncateNotePreview(body, 120));
}
