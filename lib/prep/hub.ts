import "server-only";

import { getMeetingParticipantContexts } from "@/lib/participants/context";
import type { createClient } from "@/lib/supabase/server";
import type { Meeting, MeetingPrepCard } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

import type { PrepHubItem, PrepHubPeriod, PrepHubResult } from "@/lib/prep/hub-types";

export type { PrepHubPeriod, PrepHubItem, PrepHubResult } from "@/lib/prep/hub-types";
export { parsePrepHubPeriod, PREP_HUB_PERIODS } from "@/lib/prep/hub-types";

function periodDays(period: PrepHubPeriod): number {
  return period === "14d" ? 14 : 7;
}

export async function getPrepHub(
  supabase: Client,
  period: PrepHubPeriod = "7d",
  now = new Date()
): Promise<PrepHubResult> {
  const days = periodDays(period);
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);

  const { data: meetings, error } = await supabase
    .from("meetings")
    .select("id, title, started_at, status, meeting_url, calendar_recurring_event_id")
    .gte("started_at", now.toISOString())
    .lte("started_at", end.toISOString())
    .in("status", ["scheduled", "bot_joining", "recording"])
    .order("started_at", { ascending: true });

  if (error) throw error;

  const meetingRows = (meetings ?? []) as Pick<
    Meeting,
    "id" | "title" | "started_at" | "status" | "meeting_url" | "calendar_recurring_event_id"
  >[];

  if (meetingRows.length === 0) {
    return { period, items: [] };
  }

  const meetingIds = meetingRows.map((m) => m.id);
  const seriesIds = [
    ...new Set(
      meetingRows
        .map((m) => m.calendar_recurring_event_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [prepRes, contexts] = await Promise.all([
    supabase
      .from("meeting_prep_cards")
      .select("meeting_id, briefing, related_meeting_id")
      .in("meeting_id", meetingIds)
      .gt("expires_at", now.toISOString()),
    getMeetingParticipantContexts(supabase, meetingIds, { now }),
  ]);

  if (prepRes.error) throw prepRes.error;

  const prepByMeeting = new Map<
    string,
    Pick<MeetingPrepCard, "briefing" | "related_meeting_id">
  >();
  for (const row of prepRes.data ?? []) {
    const prep = row as Pick<
      MeetingPrepCard,
      "meeting_id" | "briefing" | "related_meeting_id"
    >;
    prepByMeeting.set(prep.meeting_id, {
      briefing: prep.briefing,
      related_meeting_id: prep.related_meeting_id,
    });
  }

  const lastSeriesById = new Map<
    string,
    { id: string; title: string; startedAt: string }
  >();

  if (seriesIds.length > 0) {
    const { data: pastInSeries } = await supabase
      .from("meetings")
      .select("id, title, started_at, calendar_recurring_event_id")
      .in("calendar_recurring_event_id", seriesIds)
      .eq("status", "completed")
      .lt("started_at", now.toISOString())
      .order("started_at", { ascending: false });

    for (const row of pastInSeries ?? []) {
      const meeting = row as Pick<
        Meeting,
        "id" | "title" | "started_at" | "calendar_recurring_event_id"
      >;
      if (!meeting.calendar_recurring_event_id) continue;
      if (lastSeriesById.has(meeting.calendar_recurring_event_id)) continue;
      lastSeriesById.set(meeting.calendar_recurring_event_id, {
        id: meeting.id,
        title: meeting.title,
        startedAt: meeting.started_at,
      });
    }
  }

  const items: PrepHubItem[] = meetingRows.map((meeting) => {
    const ctx = contexts.get(meeting.id);
    return {
      meetingId: meeting.id,
      title: meeting.title,
      startedAt: meeting.started_at,
      status: meeting.status,
      meetingUrl: meeting.meeting_url,
      seriesId: meeting.calendar_recurring_event_id,
      prep: prepByMeeting.get(meeting.id) ?? null,
      participantContextCount: ctx?.noteSnippets.length ?? 0,
      participantSubtitle: ctx?.subtitle ?? null,
      lastSeriesMeeting: meeting.calendar_recurring_event_id
        ? lastSeriesById.get(meeting.calendar_recurring_event_id) ?? null
        : null,
    };
  });

  return { period, items };
}
