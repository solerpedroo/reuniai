import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { generateMeetingPrep } from "@/lib/llm/meeting-prep";
import { isLlmConfigured } from "@/lib/llm/client";
import { createNotification } from "@/lib/notifications/create";
import type { MeetingPrepCard } from "@/lib/workflow/types";
import type { ActionItem, Meeting, MeetingSummary } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;

const PREP_WINDOW_MINUTES = 10;

export async function getActivePrepCard(
  admin: AdminClient,
  userId: string
): Promise<(MeetingPrepCard & { meeting: Pick<Meeting, "id" | "title" | "started_at"> }) | null> {
  const now = new Date().toISOString();

  const { data: prep, error } = await admin
    .from("meeting_prep_cards")
    .select("*")
    .eq("user_id", userId)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!prep) return null;

  const card = prep as MeetingPrepCard;
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, title, started_at")
    .eq("id", card.meeting_id)
    .maybeSingle<Pick<Meeting, "id" | "title" | "started_at">>();

  if (!meeting) return null;

  return {
    ...card,
    meeting,
  };
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

async function findRelatedMeeting(
  admin: AdminClient,
  userId: string,
  upcomingMeetingId: string,
  participantEmails: string[]
): Promise<{ meeting: Meeting; summary: MeetingSummary | null } | null> {
  if (participantEmails.length === 0) return null;

  const { data: pastMeetings } = await admin
    .from("meetings")
    .select("id, title, started_at, status")
    .eq("user_id", userId)
    .neq("id", upcomingMeetingId)
    .in("status", ["completed", "partial"])
    .order("started_at", { ascending: false })
    .limit(30);

  for (const meeting of (pastMeetings ?? []) as Meeting[]) {
    const { data: participants } = await admin
      .from("participants")
      .select("email")
      .eq("meeting_id", meeting.id);

    const emails = new Set(
      ((participants ?? []) as { email: string | null }[])
        .map((p) => normalizeEmail(p.email))
        .filter((e): e is string => Boolean(e))
    );

    const overlap = participantEmails.some((email) => emails.has(email));
    if (!overlap) continue;

    const { data: summary } = await admin
      .from("meeting_summaries")
      .select("*")
      .eq("meeting_id", meeting.id)
      .maybeSingle<MeetingSummary>();

    return { meeting, summary: summary ?? null };
  }

  return null;
}

export async function generatePrepForMeeting(
  admin: AdminClient,
  meetingId: string
): Promise<MeetingPrepCard | null> {
  if (!isLlmConfigured()) return null;

  const { data: meeting } = await admin
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle<Meeting>();

  if (!meeting) return null;
  if (!["scheduled", "bot_joining"].includes(meeting.status)) return null;

  const startsAt = new Date(meeting.started_at).getTime();
  const now = Date.now();
  const windowMs = PREP_WINDOW_MINUTES * 60_000;
  if (startsAt < now || startsAt > now + windowMs) return null;

  const { data: participants } = await admin
    .from("participants")
    .select("email, name")
    .eq("meeting_id", meetingId);

  const participantEmails = ((participants ?? []) as { email: string | null; name: string }[])
    .map((p) => normalizeEmail(p.email))
    .filter((e): e is string => Boolean(e));

  const related = await findRelatedMeeting(admin, meeting.user_id, meetingId, participantEmails);

  const { data: openItems } = await admin
    .from("action_items")
    .select("title, assignee")
    .eq("user_id", meeting.user_id)
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(8);

  const prep = await generateMeetingPrep({
    upcomingTitle: meeting.title,
    upcomingStartsAt: meeting.started_at,
    relatedMeetingTitle: related?.meeting.title,
    relatedSummary: related?.summary?.executive_summary,
    openActionItems: (openItems ?? []) as Pick<ActionItem, "title" | "assignee">[],
    participantOverlap: ((participants ?? []) as { name: string }[]).map((p) => p.name),
  });

  const expiresAt = new Date(startsAt + 60 * 60_000).toISOString();

  const { data, error } = await admin
    .from("meeting_prep_cards")
    .upsert(
      {
        meeting_id: meetingId,
        user_id: meeting.user_id,
        briefing: prep.briefing,
        related_meeting_id: related?.meeting.id ?? null,
        expires_at: expiresAt,
      },
      { onConflict: "meeting_id" }
    )
    .select("*")
    .single();

  if (error) throw error;

  await createNotification(admin, {
    userId: meeting.user_id,
    title: "Prep disponível",
    body: `Briefing pronto para "${meeting.title}".`,
    href: `/reunioes/${meetingId}`,
  });

  return data as MeetingPrepCard;
}

export async function runMeetingPrepCron(admin: AdminClient): Promise<{ generated: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + PREP_WINDOW_MINUTES * 60_000);

  const { data: upcoming, error } = await admin
    .from("meetings")
    .select("id")
    .in("status", ["scheduled", "bot_joining"])
    .gte("started_at", now.toISOString())
    .lte("started_at", windowEnd.toISOString());

  if (error) throw error;

  let generated = 0;
  for (const row of upcoming ?? []) {
    const meetingId = (row as { id: string }).id;
    const card = await generatePrepForMeeting(admin, meetingId);
    if (card) generated += 1;
  }

  return { generated };
}
