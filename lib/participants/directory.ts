import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { ActionItem, Meeting } from "@/lib/supabase/types";
import {
  assigneeMatchesParticipant,
  decodeParticipantKey,
  displayNameFromKey,
  encodeParticipantKey,
  normalizeEmail,
  participantKey,
} from "@/lib/participants/normalize";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ParticipantSort = "recent" | "meetings" | "tasks";

export type ParticipantDirectoryEntry = {
  key: string;
  hrefKey: string;
  displayName: string;
  email: string | null;
  meetingCount: number;
  lastMeetingAt: string | null;
  openTaskCount: number;
};

export type ParticipantMeetingRow = Pick<
  Meeting,
  "id" | "title" | "started_at" | "status" | "calendar_recurring_event_id"
>;

export type ParticipantOpenTask = Pick<
  ActionItem,
  "id" | "meeting_id" | "title" | "assignee" | "due_date" | "status"
> & { meeting_title: string };

export type ParticipantDetail = ParticipantDirectoryEntry & {
  meetings: ParticipantMeetingRow[];
  openTasks: ParticipantOpenTask[];
  nextScheduledMeeting: ParticipantMeetingRow | null;
};

type ParticipantRow = {
  name: string;
  email: string | null;
  meeting_id: string;
  meetings: {
    id: string;
    title: string;
    started_at: string;
    status: Meeting["status"];
    calendar_recurring_event_id: string | null;
  } | {
    id: string;
    title: string;
    started_at: string;
    status: Meeting["status"];
    calendar_recurring_event_id: string | null;
  }[] | null;
};

function unwrapMeeting(row: ParticipantRow) {
  const meeting = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
  return meeting ?? null;
}

function sortDirectory(
  entries: ParticipantDirectoryEntry[],
  sort: ParticipantSort
): ParticipantDirectoryEntry[] {
  const copy = [...entries];
  switch (sort) {
    case "meetings":
      return copy.sort(
        (a, b) =>
          b.meetingCount - a.meetingCount ||
          (b.lastMeetingAt ?? "").localeCompare(a.lastMeetingAt ?? "")
      );
    case "tasks":
      return copy.sort(
        (a, b) =>
          b.openTaskCount - a.openTaskCount ||
          (b.lastMeetingAt ?? "").localeCompare(a.lastMeetingAt ?? "")
      );
    case "recent":
    default:
      return copy.sort((a, b) => (b.lastMeetingAt ?? "").localeCompare(a.lastMeetingAt ?? ""));
  }
}

export async function getParticipantDirectory(
  supabase: Client,
  options: { search?: string; sort?: ParticipantSort } = {}
): Promise<ParticipantDirectoryEntry[]> {
  const { data: participantRows, error } = await supabase
    .from("participants")
    .select(
      "name, email, meeting_id, meetings!inner(id, title, started_at, status, calendar_recurring_event_id)"
    );

  if (error) throw error;

  const { data: openItems, error: itemsError } = await supabase
    .from("action_items")
    .select("id, meeting_id, title, assignee, due_date, status, meetings(title)")
    .eq("status", "open");

  if (itemsError) throw itemsError;

  const openTasks = (openItems ?? []) as Array<
    Pick<ActionItem, "assignee"> & { meetings: { title: string } | { title: string }[] | null }
  >;

  const map = new Map<
    string,
    {
      displayName: string;
      email: string | null;
      meetingIds: Set<string>;
      lastMeetingAt: string | null;
    }
  >();

  for (const row of (participantRows ?? []) as ParticipantRow[]) {
    const meeting = unwrapMeeting(row);
    if (!meeting) continue;

    const key = participantKey(row.email, row.name);
    const existing = map.get(key) ?? {
      displayName: row.name.trim(),
      email: normalizeEmail(row.email),
      meetingIds: new Set<string>(),
      lastMeetingAt: null,
    };

    if (!existing.email && row.email) {
      existing.email = normalizeEmail(row.email);
    }
    if (row.name.trim().length > existing.displayName.length) {
      existing.displayName = row.name.trim();
    }

    existing.meetingIds.add(meeting.id);
    if (!existing.lastMeetingAt || meeting.started_at > existing.lastMeetingAt) {
      existing.lastMeetingAt = meeting.started_at;
    }

    map.set(key, existing);
  }

  const entries: ParticipantDirectoryEntry[] = [];

  for (const [key, value] of map) {
    let openTaskCount = 0;
    for (const task of openTasks) {
      if (assigneeMatchesParticipant(task.assignee, value.displayName, value.email)) {
        openTaskCount += 1;
      }
    }

    entries.push({
      key,
      hrefKey: encodeParticipantKey(key),
      displayName: value.displayName,
      email: value.email,
      meetingCount: value.meetingIds.size,
      lastMeetingAt: value.lastMeetingAt,
      openTaskCount,
    });
  }

  let filtered = entries;
  const search = options.search?.trim().toLowerCase();
  if (search) {
    filtered = entries.filter(
      (entry) =>
        entry.displayName.toLowerCase().includes(search) ||
        (entry.email?.includes(search) ?? false)
    );
  }

  return sortDirectory(filtered, options.sort ?? "recent");
}

export async function getParticipantDetail(
  supabase: Client,
  hrefKey: string
): Promise<ParticipantDetail | null> {
  const key = decodeParticipantKey(hrefKey);
  const directory = await getParticipantDirectory(supabase);
  const entry = directory.find((row) => row.key === key);
  if (!entry) return null;

  const { data: participantRows, error } = await supabase
    .from("participants")
    .select(
      "name, email, meeting_id, meetings!inner(id, title, started_at, status, calendar_recurring_event_id)"
    );

  if (error) throw error;

  const meetings: ParticipantMeetingRow[] = [];
  let displayName = entry.displayName;

  for (const row of (participantRows ?? []) as ParticipantRow[]) {
    if (participantKey(row.email, row.name) !== key) continue;
    const meeting = unwrapMeeting(row);
    if (!meeting) continue;
    if (row.name.trim().length > displayName.length) {
      displayName = row.name.trim();
    }
    meetings.push({
      id: meeting.id,
      title: meeting.title,
      started_at: meeting.started_at,
      status: meeting.status,
      calendar_recurring_event_id: meeting.calendar_recurring_event_id,
    });
  }

  meetings.sort((a, b) => b.started_at.localeCompare(a.started_at));

  const { data: openItems, error: itemsError } = await supabase
    .from("action_items")
    .select("id, meeting_id, title, assignee, due_date, status, meetings(title)")
    .eq("status", "open");

  if (itemsError) throw itemsError;

  const openTasks: ParticipantOpenTask[] = [];
  for (const row of openItems ?? []) {
    const typed = row as Pick<
      ActionItem,
      "id" | "meeting_id" | "title" | "assignee" | "due_date" | "status"
    > & { meetings: { title: string } | { title: string }[] | null };
    if (!assigneeMatchesParticipant(typed.assignee, displayName, entry.email)) continue;
    const meetingTitle = Array.isArray(typed.meetings)
      ? typed.meetings[0]?.title
      : typed.meetings?.title;
    openTasks.push({
      ...typed,
      meeting_title: meetingTitle ?? "Reunião",
    });
  }

  const now = new Date().toISOString();
  const participantEmails = entry.email ? [entry.email] : [];

  let nextScheduledMeeting: ParticipantMeetingRow | null = null;
  if (participantEmails.length > 0) {
    const { data: upcomingParticipants } = await supabase
      .from("participants")
      .select(
        "email, meetings!inner(id, title, started_at, status, calendar_recurring_event_id)"
      )
      .in("email", participantEmails);

    for (const row of (upcomingParticipants ?? []) as ParticipantRow[]) {
      const meeting = unwrapMeeting(row);
      if (!meeting) continue;
      if (!["scheduled", "bot_joining"].includes(meeting.status)) continue;
      if (meeting.started_at <= now) continue;
      if (!nextScheduledMeeting || meeting.started_at < nextScheduledMeeting.started_at) {
        nextScheduledMeeting = {
          id: meeting.id,
          title: meeting.title,
          started_at: meeting.started_at,
          status: meeting.status,
          calendar_recurring_event_id: meeting.calendar_recurring_event_id,
        };
      }
    }
  }

  return {
    ...entry,
    displayName,
    meetings,
    openTasks,
    nextScheduledMeeting,
  };
}

export function participantDetailTitle(key: string, fallback: string): string {
  return displayNameFromKey(key, fallback);
}
