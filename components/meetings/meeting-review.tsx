"use client";

import { useCallback, useMemo, useState } from "react";
import { MeetingCommentsPanel } from "@/components/meetings/meeting-comments-panel";
import { MeetingHighlightsPanel } from "@/components/meetings/meeting-highlights-panel";
import { SpeakerMappingEditor } from "@/components/meetings/speaker-mapping-editor";
import { MeetingLiveStatus } from "@/components/meetings/meeting-live-status";
import { MeetingTabs } from "@/components/meetings/meeting-tabs";
import { RecordingPlayer } from "@/components/meetings/recording-player";
import { SummaryView } from "@/components/meetings/summary-view";
import type { Citation } from "@/lib/meetings/chat";
import { computeTalkTime } from "@/lib/meetings/talk-time";
import type { ActionItem, Meeting, MeetingSummary, TranscriptSegment } from "@/lib/supabase/types";
import type {
  MeetingFollowUp,
  MeetingComment,
  MeetingHighlight,
  SpeakerMapping,
} from "@/lib/workflow/types";
import type { ChatUiMessage } from "@/components/meetings/meeting-tabs";

export function MeetingReview({
  meeting,
  hasRecording,
  segments,
  summary,
  actionItems,
  chatMessages,
  llmEnabled,
  initialSeekMs,
  followUp,
  comments,
  highlights,
  speakerMappings,
}: {
  meeting: Meeting;
  hasRecording: boolean;
  segments: TranscriptSegment[];
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
  chatMessages: ChatUiMessage[];
  llmEnabled: boolean;
  initialSeekMs?: number;
  followUp?: MeetingFollowUp | null;
  comments: MeetingComment[];
  highlights: MeetingHighlight[];
  speakerMappings: SpeakerMapping[];
}) {
  const [currentTimeMs, setCurrentTimeMs] = useState(initialSeekMs ?? 0);
  const [highlightMs, setHighlightMs] = useState<number | null>(initialSeekMs ?? null);

  const talkTime = useMemo(() => computeTalkTime(segments), [segments]);

  const seek = useCallback((ms: number) => {
    setCurrentTimeMs(ms);
    setHighlightMs(ms);
  }, []);

  const handleCitation = useCallback(
    (citation: Citation) => {
      const exact = segments.find((s) => s.start_ms === citation.start_ms);
      const closest =
        exact ??
        segments.reduce<TranscriptSegment | null>((best, segment) => {
          if (!best) return segment;
          const bestDiff = Math.abs(best.start_ms - citation.start_ms);
          const segDiff = Math.abs(segment.start_ms - citation.start_ms);
          return segDiff < bestDiff ? segment : best;
        }, null);

      if (!closest) return;
      seek(closest.start_ms);
    },
    [segments, seek]
  );

  return (
    <div className="space-y-6">
      {hasRecording && (
        <RecordingPlayer
          meetingId={meeting.id}
          currentTimeMs={currentTimeMs}
          onTimeUpdate={setCurrentTimeMs}
          onSeek={seek}
        />
      )}

      <MeetingHighlightsPanel
        meetingId={meeting.id}
        initialHighlights={highlights}
        currentTimeMs={currentTimeMs}
        onSeek={seek}
      />

      <SpeakerMappingEditor
        meetingId={meeting.id}
        segments={segments}
        initialMappings={speakerMappings}
      />

      <MeetingLiveStatus meeting={meeting} />

      <MeetingCommentsPanel
        meetingId={meeting.id}
        initialComments={comments}
        currentTimeMs={currentTimeMs}
        onSeek={seek}
      />

      <MeetingTabs
        meetingId={meeting.id}
        summary={<SummaryView summary={summary} talkTime={talkTime} />}
        segments={segments}
        actionItems={actionItems}
        chatMessages={chatMessages}
        llmEnabled={llmEnabled}
        currentTimeMs={currentTimeMs}
        highlightMs={highlightMs}
        onHighlightDone={() => setHighlightMs(null)}
        onSeek={seek}
        onCitationClick={handleCitation}
        followUp={followUp}
      />
    </div>
  );
}
