import "server-only";

import {
  deriveFollowUpStatus,
  previewFollowUpBody,
  type FollowUpHubItem,
  type FollowUpsHub,
  type FollowUpStatus,
} from "@/lib/follow-ups/hub-types";
import type { createClient } from "@/lib/supabase/server";
import type { Meeting } from "@/lib/supabase/types";
import type { MeetingFollowUp } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type {
  FollowUpHubItem,
  FollowUpsHub,
  FollowUpStatus,
} from "@/lib/follow-ups/hub-types";
export {
  parseFollowUpStatusFilter,
  FOLLOW_UP_STATUS_FILTERS,
} from "@/lib/follow-ups/hub-types";

function startOfWeek(now: Date): Date {
  const result = new Date(now);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export async function getFollowUpsHub(
  supabase: Client,
  options: { status?: FollowUpStatus | "pendente" | "all" } = {},
  now = new Date()
): Promise<FollowUpsHub> {
  const { data, error } = await supabase
    .from("meeting_follow_ups")
    .select("*, meetings(id, title, started_at, meeting_reviewed_at)")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  type Row = MeetingFollowUp & {
    meetings:
      | Pick<Meeting, "id" | "title" | "started_at" | "meeting_reviewed_at">
      | Pick<Meeting, "id" | "title" | "started_at" | "meeting_reviewed_at">[]
      | null;
  };

  const weekStart = startOfWeek(now);

  let pendingCount = 0;
  let sentThisWeekCount = 0;
  let doneCount = 0;

  const items: FollowUpHubItem[] = [];

  for (const row of data ?? []) {
    const typed = row as Row;
    const meeting = Array.isArray(typed.meetings) ? typed.meetings[0] : typed.meetings;
    if (!meeting) continue;

    const status = deriveFollowUpStatus(typed);
    if (!typed.follow_up_done_at) pendingCount += 1;
    if (typed.sent_at && new Date(typed.sent_at) >= weekStart) sentThisWeekCount += 1;
    if (typed.follow_up_done_at) doneCount += 1;

    const filter = options.status ?? "pendente";
    if (filter === "pendente" && typed.follow_up_done_at) continue;
    if (filter !== "all" && filter !== "pendente" && status !== filter) continue;

    items.push({
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      meetingStartedAt: meeting.started_at,
      subject: typed.subject,
      bodyPreview: previewFollowUpBody(typed.body),
      status,
      sentAt: typed.sent_at,
      followUpDoneAt: typed.follow_up_done_at,
    });
  }

  items.sort((a, b) => {
    if (a.status === "draft" && b.status !== "draft") return -1;
    if (b.status === "draft" && a.status !== "draft") return 1;
    return new Date(b.meetingStartedAt).getTime() - new Date(a.meetingStartedAt).getTime();
  });

  return { items, pendingCount, sentThisWeekCount, doneCount };
}
