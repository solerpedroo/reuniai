import type { TranscriptSegment } from "@/lib/supabase/types";

export type SpeakerTalkTime = {
  speaker: string;
  durationMs: number;
  percentage: number;
  wordCount: number;
};

export function computeTalkTime(segments: TranscriptSegment[]): SpeakerTalkTime[] {
  if (segments.length === 0) return [];

  const totals = new Map<string, { durationMs: number; wordCount: number }>();

  for (const segment of segments) {
    const durationMs = Math.max(segment.end_ms - segment.start_ms, 0);
    const words = segment.text.trim().split(/\s+/).filter(Boolean).length;
    const current = totals.get(segment.speaker_label) ?? { durationMs: 0, wordCount: 0 };
    totals.set(segment.speaker_label, {
      durationMs: current.durationMs + durationMs,
      wordCount: current.wordCount + words,
    });
  }

  const totalDuration = [...totals.values()].reduce((sum, item) => sum + item.durationMs, 0) || 1;

  return [...totals.entries()]
    .map(([speaker, stats]) => ({
      speaker,
      durationMs: stats.durationMs,
      wordCount: stats.wordCount,
      percentage: Math.round((stats.durationMs / totalDuration) * 100),
    }))
    .sort((a, b) => b.durationMs - a.durationMs);
}
