import "server-only";

import { computeTalkTime, type SpeakerTalkTime } from "@/lib/meetings/talk-time";
import { periodToRange } from "@/lib/insights/period-stats";
import type {
  AggregatedSpeaker,
  OneOnOneMeeting,
  ParticipantTalkTimeSummary,
  SeriesTalkTimeBreakdown,
  TalkTimePeriod,
  TalkTimeStats,
} from "@/lib/insights/talk-time-types";
import type { createClient } from "@/lib/supabase/server";
import type { Meeting, TranscriptSegment } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type {
  AggregatedSpeaker,
  OneOnOneMeeting,
  ParticipantTalkTimeSummary,
  SeriesTalkTimeBreakdown,
  TalkTimePeriod,
  TalkTimeStats,
} from "@/lib/insights/talk-time-types";

export { parseTalkTimePeriod, TALK_TIME_PERIODS } from "@/lib/insights/talk-time-types";

function balanceScoreForMeeting(speakers: SpeakerTalkTime[]): number {
  if (speakers.length < 2) return 100;
  const percentages = speakers.map((s) => s.percentage);
  const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
  const variance =
    percentages.reduce((acc, p) => acc + (p - avg) ** 2, 0) / percentages.length;
  const stdDev = Math.sqrt(variance);
  return Math.round(Math.max(0, Math.min(100, 100 - stdDev * 2.5)));
}

function aggregateSpeakers(
  perMeeting: Map<string, SpeakerTalkTime[]>
): AggregatedSpeaker[] {
  const totals = new Map<string, { durationMs: number; meetingCount: number }>();

  for (const speakers of perMeeting.values()) {
    for (const speaker of speakers) {
      const current = totals.get(speaker.speaker) ?? { durationMs: 0, meetingCount: 0 };
      totals.set(speaker.speaker, {
        durationMs: current.durationMs + speaker.durationMs,
        meetingCount: current.meetingCount + 1,
      });
    }
  }

  const totalMs = [...totals.values()].reduce((sum, item) => sum + item.durationMs, 0) || 1;

  return [...totals.entries()]
    .map(([speaker, stats]) => ({
      speaker,
      durationMs: stats.durationMs,
      meetingCount: stats.meetingCount,
      percentage: Math.round((stats.durationMs / totalMs) * 100),
    }))
    .sort((a, b) => b.durationMs - a.durationMs);
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSelfSpeaker(speaker: string, selfNames: string[]): boolean {
  const normalized = normalizeName(speaker);
  return selfNames.some((name) => normalized.includes(name) || name.includes(normalized));
}

function buildOneOnOnes(
  meetings: { id: string; title: string; started_at: string }[],
  perMeeting: Map<string, SpeakerTalkTime[]>,
  selfNames: string[]
): OneOnOneMeeting[] {
  const results: OneOnOneMeeting[] = [];

  for (const meeting of meetings) {
    const speakers = perMeeting.get(meeting.id) ?? [];
    if (speakers.length !== 2) continue;

    const [a, b] = speakers;
    const aIsSelf = matchesSelfSpeaker(a.speaker, selfNames);
    const bIsSelf = matchesSelfSpeaker(b.speaker, selfNames);

    let self = a;
    let other = b;
    if (bIsSelf && !aIsSelf) {
      self = b;
      other = a;
    } else if (!aIsSelf && !bIsSelf) {
      continue;
    }

    results.push({
      meetingId: meeting.id,
      title: meeting.title,
      startedAt: meeting.started_at,
      selfSpeaker: self.speaker,
      otherSpeaker: other.speaker,
      selfPercent: self.percentage,
      otherPercent: other.percentage,
      imbalanced: self.percentage > 70 || other.percentage > 70,
    });
  }

  return results.sort(
    (x, y) => new Date(y.startedAt).getTime() - new Date(x.startedAt).getTime()
  );
}

function buildSeriesBreakdown(
  meetings: {
    id: string;
    title: string;
    calendar_recurring_event_id: string | null;
  }[],
  perMeeting: Map<string, SpeakerTalkTime[]>
): SeriesTalkTimeBreakdown[] {
  const bySeries = new Map<string, { title: string; meetingIds: string[] }>();

  for (const meeting of meetings) {
    if (!meeting.calendar_recurring_event_id) continue;
    const current = bySeries.get(meeting.calendar_recurring_event_id) ?? {
      title: meeting.title.replace(/\s*#\d+\s*$/, "").trim(),
      meetingIds: [],
    };
    current.meetingIds.push(meeting.id);
    bySeries.set(meeting.calendar_recurring_event_id, current);
  }

  return [...bySeries.entries()]
    .map(([seriesId, group]) => {
      const seriesMap = new Map<string, SpeakerTalkTime[]>();
      for (const meetingId of group.meetingIds) {
        const speakers = perMeeting.get(meetingId);
        if (speakers?.length) seriesMap.set(meetingId, speakers);
      }
      return {
        seriesId,
        seriesTitle: group.title,
        meetingCount: group.meetingIds.length,
        speakers: aggregateSpeakers(seriesMap).slice(0, 6),
      };
    })
    .filter((item) => item.meetingCount >= 2)
    .sort((a, b) => b.meetingCount - a.meetingCount)
    .slice(0, 6);
}

export async function getTalkTimeStats(
  supabase: Client,
  period: TalkTimePeriod,
  now = new Date()
): Promise<TalkTimeStats> {
  const { start, end } = periodToRange(period, now);

  const [{ data: meetings, error: meetingsError }, { data: profile }] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, title, started_at, calendar_recurring_event_id")
      .eq("status", "completed")
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString())
      .order("started_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("display_name").maybeSingle(),
  ]);

  if (meetingsError) throw meetingsError;

  const meetingRows = (meetings ?? []) as Pick<
    Meeting,
    "id" | "title" | "started_at" | "calendar_recurring_event_id"
  >[];
  const meetingIds = meetingRows.map((m) => m.id);

  if (meetingIds.length === 0) {
    return {
      period,
      meetingCount: 0,
      analyzedMeetings: 0,
      uniqueSpeakers: 0,
      totalTalkMs: 0,
      avgBalanceScore: 0,
      dominantSpeaker: null,
      topSpeakers: [],
      oneOnOnes: [],
      bySeries: [],
    };
  }

  const { data: segments, error: segmentsError } = await supabase
    .from("transcript_segments")
    .select("meeting_id, start_ms, end_ms, speaker_label, text, sequence")
    .in("meeting_id", meetingIds)
    .order("sequence", { ascending: true });

  if (segmentsError) throw segmentsError;

  const segmentsByMeeting = new Map<string, TranscriptSegment[]>();
  for (const row of segments ?? []) {
    const segment = row as TranscriptSegment;
    const list = segmentsByMeeting.get(segment.meeting_id) ?? [];
    list.push(segment);
    segmentsByMeeting.set(segment.meeting_id, list);
  }

  const perMeeting = new Map<string, SpeakerTalkTime[]>();
  const balanceScores: number[] = [];

  for (const meetingId of meetingIds) {
    const meetingSegments = segmentsByMeeting.get(meetingId) ?? [];
    if (meetingSegments.length === 0) continue;
    const talkTime = computeTalkTime(meetingSegments);
    if (talkTime.length === 0) continue;
    perMeeting.set(meetingId, talkTime);
    balanceScores.push(balanceScoreForMeeting(talkTime));
  }

  const topSpeakers = aggregateSpeakers(perMeeting).slice(0, 8);
  const totalTalkMs = topSpeakers.reduce((sum, s) => sum + s.durationMs, 0);

  const selfNames = [
    (profile as { display_name?: string | null } | null)?.display_name,
  ]
    .filter((name): name is string => Boolean(name?.trim()))
    .map(normalizeName);

  const oneOnOnes = buildOneOnOnes(meetingRows, perMeeting, selfNames);
  const bySeries = buildSeriesBreakdown(meetingRows, perMeeting);

  return {
    period,
    meetingCount: meetingRows.length,
    analyzedMeetings: perMeeting.size,
    uniqueSpeakers: topSpeakers.length,
    totalTalkMs,
    avgBalanceScore:
      balanceScores.length > 0
        ? Math.round(balanceScores.reduce((a, b) => a + b, 0) / balanceScores.length)
        : 0,
    dominantSpeaker: topSpeakers[0]?.speaker ?? null,
    topSpeakers,
    oneOnOnes,
    bySeries,
  };
}

export async function getParticipantTalkTimeSummary(
  supabase: Client,
  participantName: string,
  period: TalkTimePeriod = "90d"
): Promise<ParticipantTalkTimeSummary | null> {
  const stats = await getTalkTimeStats(supabase, period);
  const normalized = normalizeName(participantName);
  const match = stats.topSpeakers.find(
    (speaker) =>
      normalizeName(speaker.speaker) === normalized ||
      normalizeName(speaker.speaker).includes(normalized) ||
      normalized.includes(normalizeName(speaker.speaker))
  );

  if (!match) return null;

  return {
    meetingCount: match.meetingCount,
    avgPercent: match.percentage,
  };
}
