import type { createClient } from "@/lib/supabase/server";
import type { AgendaEntry, DailyTimeline } from "@/lib/agenda/types";
import { getMeetingParticipantContexts } from "@/lib/participants/context";
import { needsPostCallReview, REVIEW_QUEUE_HREF } from "@/lib/meetings/post-call-review";
import { getActivePrepCard } from "@/lib/meetings/prep";
import { localDateIsoInTimezone, resolveTimezone } from "@/lib/timezone/local-date";
import type { ActionItem, Meeting } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";

type Client = Awaited<ReturnType<typeof createClient>>;

const ACTIVE_STATUSES = ["scheduled", "bot_joining", "recording"] as const;

function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function isSnoozed(item: Pick<ActionItem, "snoozed_until">, now: Date): boolean {
  return item.snoozed_until != null && new Date(item.snoozed_until) > now;
}

function classifySection(
  kind: AgendaEntry["kind"],
  sortAt: string,
  now: Date,
  meetingStatus?: Meeting["status"]
): AgendaEntry["section"] {
  if (kind === "review_pending" || kind === "task_due") return "now";

  if (meetingStatus === "completed" || meetingStatus === "partial") {
    return "done";
  }

  const deltaMs = new Date(sortAt).getTime() - now.getTime();
  if (deltaMs <= 30 * 60_000 && deltaMs >= -15 * 60_000) return "now";
  if (deltaMs < -15 * 60_000) return "done";
  return "later";
}

export function parseAgendaDate(value: string | undefined, timezone: string): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return localDateIsoInTimezone(timezone);
}

export function shiftAgendaDate(dateIso: string, days: number): string {
  const base = new Date(`${dateIso}T12:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export async function getDailyTimeline(
  supabase: Client,
  options: { dateIso?: string; now?: Date } = {}
): Promise<DailyTimeline> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const timezone = resolveTimezone(null);
    return {
      dateIso: options.dateIso ?? "",
      timezone,
      todayIso: localDateIsoInTimezone(timezone),
      entries: [],
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle<{ timezone: string | null }>();

  const timezone = resolveTimezone(profile?.timezone);
  const now = options.now ?? new Date();
  const todayIso = localDateIsoInTimezone(timezone, now);
  const dateIso = parseAgendaDate(options.dateIso, timezone);

  const rangeStart = new Date(`${dateIso}T00:00:00`);
  rangeStart.setDate(rangeStart.getDate() - 1);
  const rangeEnd = new Date(`${dateIso}T00:00:00`);
  rangeEnd.setDate(rangeEnd.getDate() + 2);

  const admin = createAdminClient();

  const [meetingsRes, tasksRes, prepCard] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, title, started_at, status, meeting_reviewed_at, review_snoozed_until, meeting_url")
      .gte("started_at", rangeStart.toISOString())
      .lt("started_at", rangeEnd.toISOString())
      .order("started_at", { ascending: true }),
    supabase
      .from("action_items")
      .select("id, title, due_date, meeting_id, snoozed_until, status, meetings(title)")
      .eq("status", "open")
      .eq("due_date", dateIso),
    getActivePrepCard(admin, user.id),
  ]);

  if (meetingsRes.error) throw meetingsRes.error;
  if (tasksRes.error) throw tasksRes.error;

  const entries: AgendaEntry[] = [];

  for (const row of (meetingsRes.data ?? []) as Meeting[]) {
    if (localDateIsoInTimezone(timezone, new Date(row.started_at)) !== dateIso) continue;

    if (ACTIVE_STATUSES.includes(row.status as (typeof ACTIVE_STATUSES)[number])) {
      entries.push({
        id: `meeting-${row.id}`,
        kind: "scheduled_meeting",
        section: classifySection("scheduled_meeting", row.started_at, now, row.status),
        sortAt: row.started_at,
        title: row.title,
        subtitle: "Reunião agendada",
        href: row.meeting_url ?? `/reunioes/${row.id}`,
        timeLabel: formatTime(row.started_at, timezone),
      });
    }

    if (needsPostCallReview(row)) {
      entries.push({
        id: `review-${row.id}`,
        kind: "review_pending",
        section: "now",
        sortAt: row.started_at,
        title: row.title,
        subtitle: "Revisão pós-call pendente",
        href: REVIEW_QUEUE_HREF,
        timeLabel: formatTime(row.started_at, timezone),
      });
    }
  }

  if (
    prepCard &&
    localDateIsoInTimezone(timezone, new Date(prepCard.meeting.started_at)) === dateIso
  ) {
    entries.push({
      id: `prep-${prepCard.id}`,
      kind: "prep",
      section: classifySection("prep", prepCard.meeting.started_at, now),
      sortAt: prepCard.meeting.started_at,
      title: prepCard.meeting.title,
      subtitle: "Prep para a reunião",
      href: `/reunioes/${prepCard.meeting_id}?prep=1`,
      timeLabel: formatTime(prepCard.meeting.started_at, timezone),
    });
  }

  type TaskRow = ActionItem & {
    meetings: { title: string } | { title: string }[] | null;
  };

  for (const row of (tasksRes.data ?? []) as TaskRow[]) {
    if (isSnoozed(row, now)) continue;
    const meeting = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
    entries.push({
      id: `task-${row.id}`,
      kind: "task_due",
      section: "now",
      sortAt: `${dateIso}T09:00:00.000Z`,
      title: row.title,
      subtitle: meeting?.title ?? "Tarefa",
      href: `/tarefas?filtro=today`,
      timeLabel: "Hoje",
    });
  }

  entries.sort((a, b) => a.sortAt.localeCompare(b.sortAt));

  const scheduledIds = entries
    .filter((entry) => entry.kind === "scheduled_meeting")
    .map((entry) => entry.id.replace(/^meeting-/, ""));

  if (scheduledIds.length > 0) {
    const contexts = await getMeetingParticipantContexts(supabase, scheduledIds, { now });
    for (const entry of entries) {
      if (entry.kind !== "scheduled_meeting") continue;
      const meetingId = entry.id.replace(/^meeting-/, "");
      const context = contexts.get(meetingId);
      if (context?.subtitle) {
        entry.subtitle = context.subtitle;
      }
    }
  }

  return { dateIso, timezone, todayIso, entries };
}
