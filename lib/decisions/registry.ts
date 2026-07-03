import "server-only";

import { normalizeDecisionKey } from "@/lib/decisions/normalize";
import {
  computeCompletionRate,
  computeStaleDays,
  getOutcomeMapForUser,
} from "@/lib/decisions/outcomes";
import type { DecisionOutcomeRow } from "@/lib/decisions/outcome-types";
import { periodToRange } from "@/lib/insights/period-stats";
import { parseDecisions } from "@/lib/meetings/insights";
import type { DecisionPeriod, DecisionRegistry } from "@/lib/decisions/registry-types";
import type { createClient } from "@/lib/supabase/server";
import type { Meeting, MeetingSummary } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type { DecisionEntry, DecisionPeriod, DecisionRegistry } from "@/lib/decisions/registry-types";
export { parseDecisionPeriod, DECISION_PERIODS } from "@/lib/decisions/registry-types";
export { parseOutcomeStatus, DECISION_OUTCOME_STATUSES } from "@/lib/decisions/outcome-types";

export async function getDecisionRegistry(
  supabase: Client,
  period: DecisionPeriod,
  options: { statusFilter?: DecisionOutcomeRow["status"] | "all"; now?: Date } = {}
): Promise<DecisionRegistry> {
  const now = options.now ?? new Date();
  const { start, end } = periodToRange(period, now);

  const { data: meetings, error: meetingsError } = await supabase
    .from("meetings")
    .select("id, title, started_at, calendar_recurring_event_id, status")
    .gte("started_at", start.toISOString())
    .lte("started_at", end.toISOString())
    .in("status", ["completed", "partial", "bot_joining", "recording"]);

  if (meetingsError) throw meetingsError;

  const meetingRows = (meetings ?? []) as (Pick<
    Meeting,
    "id" | "title" | "started_at" | "calendar_recurring_event_id"
  > & { status: string })[];

  const outcomeMap = await getOutcomeMapForUser(supabase);

  if (meetingRows.length === 0) {
    const { rate, staleCount } = computeCompletionRate([...outcomeMap.values()]);
    return {
      period,
      totalDecisions: 0,
      meetingsWithDecisions: 0,
      topRecurring: null,
      completionRate: rate,
      staleCount,
      entries: [],
    };
  }

  const meetingIds = meetingRows.map((m) => m.id);
  const meetingById = new Map(meetingRows.map((m) => [m.id, m]));

  const liveMeetingIds = meetingRows
    .filter((m) => m.status === "bot_joining" || m.status === "recording")
    .map((m) => m.id);

  const { data: liveDecisionRows } =
    liveMeetingIds.length > 0
      ? await supabase
          .from("meeting_live_decisions")
          .select("meeting_id, text, captured_at_ms")
          .in("meeting_id", liveMeetingIds)
      : { data: [] };

  const { data: summaries, error: summariesError } = await supabase
    .from("meeting_summaries")
    .select("meeting_id, decisions")
    .in("meeting_id", meetingIds);

  if (summariesError) throw summariesError;

  type RawOccurrence = {
    key: string;
    text: string;
    meeting: Pick<Meeting, "id" | "title" | "started_at" | "calendar_recurring_event_id">;
  };

  const occurrences: RawOccurrence[] = [];
  const meetingsWithDecisions = new Set<string>();

  const pushDecision = (
    meeting: Pick<Meeting, "id" | "title" | "started_at" | "calendar_recurring_event_id">,
    decision: string
  ) => {
    const text = decision.trim();
    if (!text) return;

    meetingsWithDecisions.add(meeting.id);
    occurrences.push({
      key: normalizeDecisionKey(text),
      text,
      meeting,
    });
  };

  for (const row of summaries ?? []) {
    const summary = row as Pick<MeetingSummary, "meeting_id" | "decisions">;
    const meeting = meetingById.get(summary.meeting_id);
    if (!meeting) continue;

    for (const decision of parseDecisions(summary.decisions ?? [])) {
      pushDecision(meeting, decision);
    }
  }

  for (const row of liveDecisionRows ?? []) {
    const live = row as { meeting_id: string; text: string };
    const meeting = meetingById.get(live.meeting_id);
    if (!meeting) continue;
    pushDecision(meeting, live.text);
  }

  const grouped = new Map<string, RawOccurrence[]>();
  for (const item of occurrences) {
    const list = grouped.get(item.key) ?? [];
    list.push(item);
    grouped.set(item.key, list);
  }

  const entries: DecisionRegistry["entries"] = [];

  for (const [key, items] of grouped) {
    items.sort(
      (a, b) =>
        new Date(b.meeting.started_at).getTime() - new Date(a.meeting.started_at).getTime()
    );
    const latest = items[0];
    const outcome = outcomeMap.get(key);

    const entry: DecisionRegistry["entries"][number] = {
      id: `${latest.meeting.id}:${key.slice(0, 48)}`,
      decisionKey: key,
      text: outcome?.decision_text ?? latest.text,
      meetingId: latest.meeting.id,
      meetingTitle: latest.meeting.title,
      meetingStartedAt: latest.meeting.started_at,
      seriesId: latest.meeting.calendar_recurring_event_id,
      occurrenceCount: items.length,
      status: outcome?.status ?? "pending",
      suggestedStatus: outcome?.suggested_status ?? null,
      outcomeId: outcome?.id ?? null,
      staleDays: outcome ? computeStaleDays(outcome.updated_at, now) : 0,
      timeline: items.map((item) => ({
        meetingId: item.meeting.id,
        meetingTitle: item.meeting.title,
        meetingStartedAt: item.meeting.started_at,
      })),
    };

    entries.push(entry);
  }

  entries.sort(
    (a, b) => new Date(b.meetingStartedAt).getTime() - new Date(a.meetingStartedAt).getTime()
  );

  const statusFilter = options.statusFilter ?? "all";
  const filtered =
    statusFilter === "all" ? entries : entries.filter((entry) => entry.status === statusFilter);

  const topRecurring =
    [...grouped.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .find(([, list]) => list.length > 1)?.[1][0]?.text ?? null;

  const { rate, staleCount } = computeCompletionRate([...outcomeMap.values()]);

  return {
    period,
    totalDecisions: filtered.length,
    meetingsWithDecisions: meetingsWithDecisions.size,
    topRecurring,
    completionRate: rate,
    staleCount,
    entries: filtered,
  };
}
