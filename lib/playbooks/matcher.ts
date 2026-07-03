import type { PlaybookConditions } from "@/lib/playbooks/types";

export type MeetingForPlaybook = {
  id: string;
  title: string;
  platform: string | null;
  calendar_recurring_event_id: string | null;
  analysis_template: string | null;
};

export function matchesPlaybookConditions(
  meeting: MeetingForPlaybook,
  conditions: PlaybookConditions
): boolean {
  if (conditions.title_contains) {
    const needle = conditions.title_contains.trim().toLowerCase();
    if (!needle || !meeting.title.toLowerCase().includes(needle)) {
      return false;
    }
  }

  if (conditions.series_id) {
    if (meeting.calendar_recurring_event_id !== conditions.series_id) {
      return false;
    }
  }

  if (conditions.template_id) {
    if (meeting.analysis_template !== conditions.template_id) {
      return false;
    }
  }

  if (conditions.platform) {
    if (meeting.platform !== conditions.platform) {
      return false;
    }
  }

  return true;
}
