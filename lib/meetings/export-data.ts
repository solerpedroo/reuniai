import type { RedactionAudit } from "@/lib/privacy/redact";
import type { ActionItem, Meeting, MeetingSummary, TranscriptSegment } from "@/lib/supabase/types";

export type MeetingHighlightExport = {
  label: string;
  start_ms: number;
};

export type MeetingExportData = {
  meeting: Meeting;
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
  segments: TranscriptSegment[];
  highlights: MeetingHighlightExport[];
  redactionAudit: RedactionAudit;
};
