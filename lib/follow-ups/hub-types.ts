export type FollowUpStatus = "draft" | "sent" | "done";

export const FOLLOW_UP_STATUS_FILTERS: { value: FollowUpStatus | "pendente"; label: string }[] = [
  { value: "pendente", label: "Pendentes" },
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviados" },
  { value: "done", label: "Concluídos" },
];

export type FollowUpHubItem = {
  meetingId: string;
  meetingTitle: string;
  meetingStartedAt: string;
  subject: string;
  bodyPreview: string;
  status: FollowUpStatus;
  sentAt: string | null;
  followUpDoneAt: string | null;
};

export type FollowUpsHub = {
  items: FollowUpHubItem[];
  pendingCount: number;
  sentThisWeekCount: number;
  doneCount: number;
};

export function parseFollowUpStatusFilter(
  value: string | undefined
): FollowUpStatus | "pendente" | "all" {
  if (value === "draft" || value === "sent" || value === "done" || value === "pendente") {
    return value;
  }
  return "pendente";
}

export function deriveFollowUpStatus(row: {
  sent_at: string | null;
  follow_up_done_at: string | null;
}): FollowUpStatus {
  if (row.follow_up_done_at) return "done";
  if (row.sent_at) return "sent";
  return "draft";
}

export function previewFollowUpBody(body: string, max = 140): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
