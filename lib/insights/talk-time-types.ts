import type { InsightPeriod } from "@/lib/insights/period-stats";

export type TalkTimePeriod = Extract<InsightPeriod, "7d" | "30d" | "90d">;

export const TALK_TIME_PERIODS: { value: TalkTimePeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

export type AggregatedSpeaker = {
  speaker: string;
  durationMs: number;
  percentage: number;
  meetingCount: number;
};

export type OneOnOneMeeting = {
  meetingId: string;
  title: string;
  startedAt: string;
  selfSpeaker: string;
  otherSpeaker: string;
  selfPercent: number;
  otherPercent: number;
  imbalanced: boolean;
};

export type SeriesTalkTimeBreakdown = {
  seriesId: string;
  seriesTitle: string;
  meetingCount: number;
  speakers: AggregatedSpeaker[];
};

export type TalkTimeStats = {
  period: TalkTimePeriod;
  meetingCount: number;
  analyzedMeetings: number;
  uniqueSpeakers: number;
  totalTalkMs: number;
  avgBalanceScore: number;
  dominantSpeaker: string | null;
  topSpeakers: AggregatedSpeaker[];
  oneOnOnes: OneOnOneMeeting[];
  bySeries: SeriesTalkTimeBreakdown[];
};

export type ParticipantTalkTimeSummary = {
  meetingCount: number;
  avgPercent: number;
};

export function parseTalkTimePeriod(value: string | undefined): TalkTimePeriod {
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}
