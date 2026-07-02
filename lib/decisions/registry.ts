import "server-only";

import { periodToRange } from "@/lib/insights/period-stats";
import { parseDecisions } from "@/lib/meetings/insights";
import type { DecisionPeriod, DecisionRegistry } from "@/lib/decisions/registry-types";
import type { createClient } from "@/lib/supabase/server";
import type { Meeting, MeetingSummary } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type { DecisionEntry, DecisionPeriod, DecisionRegistry } from "@/lib/decisions/registry-types";
export { parseDecisionPeriod, DECISION_PERIODS } from "@/lib/decisions/registry-types";

function normalizeDecision(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getDecisionRegistry(
  supabase: Client,
  period: DecisionPeriod,
  now = new Date()
): Promise<DecisionRegistry> {
  const { start, end } = periodToRange(period, now);

  const { data: meetings, error: meetingsError } = await supabase
    .from("meetings")
    .select("id, title, started_at, calendar_recurring_event_id")
    .gte("started_at", start.toISOString())
    .lte("started_at", end.toISOString())
    .in("status", ["completed", "partial"]);

  if (meetingsError) throw meetingsError;

  const meetingRows = (meetings ?? []) as Pick<
    Meeting,
    "id" | "title" | "started_at" | "calendar_recurring_event_id"
  >[];

  if (meetingRows.length === 0) {
    return {
      period,
      totalDecisions: 0,
      meetingsWithDecisions: 0,
      topRecurring: null,
      entries: [],
    };
  }

  const meetingIds = meetingRows.map((m) => m.id);
  const meetingById = new Map(meetingRows.map((m) => [m.id, m]));

  const { data: summaries, error: summariesError } = await supabase
    .from("meeting_summaries")
    .select("meeting_id, decisions")
    .in("meeting_id", meetingIds);

  if (summariesError) throw summariesError;

  const occurrenceCounts = new Map<string, number>();
  const entries: DecisionRegistry["entries"] = [];
  const meetingsWithDecisions = new Set<string>();

  for (const row of summaries ?? []) {
    const summary = row as Pick<MeetingSummary, "meeting_id" | "decisions">;
    const meeting = meetingById.get(summary.meeting_id);
    if (!meeting) continue;

    for (const decision of parseDecisions(summary.decisions ?? [])) {
      const text = decision.trim();
      if (!text) continue;

      const key = normalizeDecision(text);
      occurrenceCounts.set(key, (occurrenceCounts.get(key) ?? 0) + 1);
      meetingsWithDecisions.add(meeting.id);

      entries.push({
        id: `${meeting.id}:${key.slice(0, 48)}`,
        text,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        meetingStartedAt: meeting.started_at,
        seriesId: meeting.calendar_recurring_event_id,
        occurrenceCount: 0,
      });
    }
  }

  for (const entry of entries) {
    entry.occurrenceCount = occurrenceCounts.get(normalizeDecision(entry.text)) ?? 1;
  }

  entries.sort(
    (a, b) => new Date(b.meetingStartedAt).getTime() - new Date(a.meetingStartedAt).getTime()
  );

  const topRecurring =
    [...occurrenceCounts.entries()].sort((a, b) => b[1] - a[1]).find(([, count]) => count > 1)?.[0] ??
    null;

  return {
    period,
    totalDecisions: entries.length,
    meetingsWithDecisions: meetingsWithDecisions.size,
    topRecurring: topRecurring
      ? entries.find((e) => normalizeDecision(e.text) === topRecurring)?.text ?? null
      : null,
    entries,
  };
}
