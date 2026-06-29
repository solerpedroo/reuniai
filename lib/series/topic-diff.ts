import "server-only";

import { parseTopics } from "@/lib/meetings/insights";
import type { MeetingSummary } from "@/lib/supabase/types";

export type TopicDiffItem = {
  added: string[];
  removed: string[];
  fromMeetingId: string;
  toMeetingId: string;
  fromDate: string;
  toDate: string;
};

export function computeTopicDiff(
  previous: { meetingId: string; startedAt: string; summary: MeetingSummary | null },
  current: { meetingId: string; startedAt: string; summary: MeetingSummary | null }
): TopicDiffItem {
  const prevTopics = new Set(
    parseTopics(previous.summary?.topics ?? []).map((t) => t.title.toLowerCase())
  );
  const currTopics = new Set(
    parseTopics(current.summary?.topics ?? []).map((t) => t.title.toLowerCase())
  );

  const added = [...currTopics].filter((t) => !prevTopics.has(t));
  const removed = [...prevTopics].filter((t) => !currTopics.has(t));

  return {
    added,
    removed,
    fromMeetingId: previous.meetingId,
    toMeetingId: current.meetingId,
    fromDate: previous.startedAt,
    toDate: current.startedAt,
  };
}
