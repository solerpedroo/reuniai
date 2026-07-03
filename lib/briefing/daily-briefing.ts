import "server-only";

import { getCommitmentsHub } from "@/lib/commitments/hub";
import { getInboxActionItems } from "@/lib/meetings/action-items-inbox";
import { getActivePrepCard } from "@/lib/meetings/prep";
import { getReviewQueueCounts } from "@/lib/review/review-queue";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { localDateIsoInTimezone, resolveTimezone } from "@/lib/timezone/local-date";
import type { Meeting } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type DailyBriefingTask = {
  id: string;
  title: string;
  dueDate: string | null;
  meetingTitle: string;
  href: string;
};

export type DailyBriefingCommitment = {
  id: string;
  text: string;
  dueDate: string | null;
  counterparty: string | null;
  href: string;
};

export type DailyBriefingPrep = {
  meetingId: string;
  title: string;
  startedAt: string;
  briefingPreview: string;
  href: string;
};

export type DailyBriefing = {
  timezone: string;
  dateLabel: string;
  greeting: string;
  nextMeeting: {
    id: string;
    title: string;
    startedAt: string;
    minutesUntil: number;
    href: string;
  } | null;
  urgentTasks: DailyBriefingTask[];
  dueCommitments: DailyBriefingCommitment[];
  reviewPending: number;
  calendarLoadScore: number | null;
  calendarConnected: boolean;
  prepCards: DailyBriefingPrep[];
  isDayClear: boolean;
};

function formatDateLabel(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
}

function greetingForHour(timezone: string, now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(now)
  );

  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function estimateWeekLoadScore(meetings: Pick<Meeting, "started_at" | "ended_at">[]): number {
  let hours = 0;
  for (const meeting of meetings) {
    const start = Date.parse(meeting.started_at);
    const end = meeting.ended_at ? Date.parse(meeting.ended_at) : start + 3_600_000;
    hours += Math.max(0.5, (end - start) / 3_600_000);
  }
  const count = meetings.length;
  return Math.min(100, Math.round(count * 4 + hours * 3));
}

export async function getDailyBriefing(
  supabase: Client,
  options: { now?: Date } = {}
): Promise<DailyBriefing> {
  const now = options.now ?? new Date();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: DailyBriefing = {
    timezone: resolveTimezone(null),
    dateLabel: formatDateLabel(resolveTimezone(null), now),
    greeting: greetingForHour(resolveTimezone(null), now),
    nextMeeting: null,
    urgentTasks: [],
    dueCommitments: [],
    reviewPending: 0,
    calendarLoadScore: null,
    calendarConnected: false,
    prepCards: [],
    isDayClear: true,
  };

  if (!user) return empty;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle<{ timezone: string | null }>();

  const timezone = resolveTimezone(profile?.timezone);
  const todayIso = localDateIsoInTimezone(timezone, now);
  const admin = createAdminClient();

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [
    reviewCounts,
    inboxTasks,
    commitmentsHub,
    prepCard,
    calendarConnection,
    todayMeetingsRes,
    weekMeetingsRes,
    prepTodayRes,
  ] = await Promise.all([
    getReviewQueueCounts(supabase, { now }),
    getInboxActionItems(supabase, { filter: "focus" }),
    getCommitmentsHub(supabase, { status: "all" }),
    getActivePrepCard(admin, user.id),
    supabase
      .from("calendar_connections")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meetings")
      .select("id, title, started_at, status, meeting_url")
      .eq("user_id", user.id)
      .gte("started_at", `${todayIso}T00:00:00`)
      .lt("started_at", `${todayIso}T23:59:59.999`)
      .in("status", ["scheduled", "bot_joining", "recording"])
      .order("started_at", { ascending: true }),
    supabase
      .from("meetings")
      .select("started_at, ended_at")
      .eq("user_id", user.id)
      .gte("started_at", now.toISOString())
      .lte("started_at", weekEnd.toISOString())
      .in("status", ["scheduled", "bot_joining", "recording", "completed", "partial"]),
    supabase
      .from("meeting_prep_cards")
      .select("meeting_id, briefing, expires_at")
      .eq("user_id", user.id)
      .gt("expires_at", now.toISOString()),
  ]);

  const todayMeetings = (todayMeetingsRes.data ?? []) as Pick<
    Meeting,
    "id" | "title" | "started_at" | "meeting_url"
  >[];

  const upcoming = todayMeetings.find((m) => new Date(m.started_at) >= now) ?? todayMeetings[0];

  let nextMeeting: DailyBriefing["nextMeeting"] = null;
  if (upcoming) {
    const minutesUntil = Math.max(
      0,
      Math.round((Date.parse(upcoming.started_at) - now.getTime()) / 60_000)
    );
    nextMeeting = {
      id: upcoming.id,
      title: upcoming.title,
      startedAt: upcoming.started_at,
      minutesUntil,
      href: upcoming.meeting_url ?? `/reunioes/${upcoming.id}`,
    };
  }

  const urgentTasks: DailyBriefingTask[] = inboxTasks.slice(0, 3).map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.due_date,
    meetingTitle: task.meeting_title,
    href: "/tarefas?filtro=focus",
  }));

  const dueCommitments: DailyBriefingCommitment[] = commitmentsHub.items
    .filter(
      (item) =>
        item.status === "overdue" ||
        (item.status === "pending" && item.due_date === todayIso)
    )
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      text: item.text,
      dueDate: item.due_date,
      counterparty: item.counterparty,
      href: `/compromissos`,
    }));

  const prepCards: DailyBriefingPrep[] = [];

  if (
    prepCard &&
    localDateIsoInTimezone(timezone, new Date(prepCard.meeting.started_at)) === todayIso
  ) {
    prepCards.push({
      meetingId: prepCard.meeting_id,
      title: prepCard.meeting.title,
      startedAt: prepCard.meeting.started_at,
      briefingPreview: prepCard.briefing.slice(0, 180),
      href: `/reunioes/${prepCard.meeting_id}?prep=1`,
    });
  }

  type PrepRow = { meeting_id: string; briefing: string; expires_at: string };
  const prepRows = (prepTodayRes.data ?? []) as PrepRow[];

  const extraPrepIds = prepRows
    .map((row) => row.meeting_id)
    .filter((id) => !prepCards.some((p) => p.meetingId === id));

  if (extraPrepIds.length > 0) {
    const { data: prepMeetings } = await supabase
      .from("meetings")
      .select("id, title, started_at")
      .in("id", extraPrepIds);

    const meetingRows = (prepMeetings ?? []) as {
      id: string;
      title: string;
      started_at: string;
    }[];

    for (const row of prepRows) {
      const meeting = meetingRows.find((m) => m.id === row.meeting_id);
      if (!meeting) continue;
      if (localDateIsoInTimezone(timezone, new Date(meeting.started_at)) !== todayIso) continue;
      if (prepCards.some((p) => p.meetingId === meeting.id)) continue;
      prepCards.push({
        meetingId: meeting.id,
        title: meeting.title,
        startedAt: meeting.started_at,
        briefingPreview: String(row.briefing).slice(0, 180),
        href: `/reunioes/${meeting.id}?prep=1`,
      });
    }
  }

  const calendarConnected = Boolean(calendarConnection.data);
  const weekMeetings = (weekMeetingsRes.data ?? []) as Pick<Meeting, "started_at" | "ended_at">[];
  const calendarLoadScore =
    weekMeetings.length > 0 ? estimateWeekLoadScore(weekMeetings) : calendarConnected ? 0 : null;

  const isDayClear =
    !nextMeeting &&
    urgentTasks.length === 0 &&
    dueCommitments.length === 0 &&
    reviewCounts.pending === 0 &&
    prepCards.length === 0;

  return {
    timezone,
    dateLabel: formatDateLabel(timezone, now),
    greeting: greetingForHour(timezone, now),
    nextMeeting,
    urgentTasks,
    dueCommitments,
    reviewPending: reviewCounts.pending,
    calendarLoadScore,
    calendarConnected,
    prepCards,
    isDayClear,
  };
}
