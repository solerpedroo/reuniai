import type { Meeting } from "@/lib/supabase/types";

export type PrepHubPeriod = "7d" | "14d";

export const PREP_HUB_PERIODS: { value: PrepHubPeriod; label: string; days: number }[] = [
  { value: "7d", label: "7 dias", days: 7 },
  { value: "14d", label: "14 dias", days: 14 },
];

export type PrepHubItem = {
  meetingId: string;
  title: string;
  startedAt: string;
  status: Meeting["status"];
  meetingUrl: string | null;
  seriesId: string | null;
  prep: { briefing: string; related_meeting_id: string | null } | null;
  participantContextCount: number;
  participantSubtitle: string | null;
  lastSeriesMeeting: { id: string; title: string; startedAt: string } | null;
};

export type PrepHubResult = {
  period: PrepHubPeriod;
  items: PrepHubItem[];
};

export function parsePrepHubPeriod(value: string | undefined): PrepHubPeriod {
  if (value === "14d" || value === "14") return "14d";
  return "7d";
}
