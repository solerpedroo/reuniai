export type DecisionOutcomeStatus = "pending" | "in_progress" | "done" | "reversed";

export const DECISION_OUTCOME_STATUSES: {
  value: DecisionOutcomeStatus;
  label: string;
}[] = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Cumprida" },
  { value: "reversed", label: "Revertida" },
];

export const DECISION_OUTCOME_STATUS_LABELS: Record<DecisionOutcomeStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Cumprida",
  reversed: "Revertida",
};

export type DecisionOutcomeRow = {
  id: string;
  user_id: string;
  decision_key: string;
  decision_text: string;
  status: DecisionOutcomeStatus;
  first_meeting_id: string | null;
  last_meeting_id: string | null;
  suggested_status: DecisionOutcomeStatus | null;
  suggested_at: string | null;
  suggested_meeting_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DecisionOutcomeEvent = {
  id: string;
  outcome_id: string;
  meeting_id: string | null;
  event_type: string;
  detail: string | null;
  created_at: string;
};

export function parseOutcomeStatus(value: string | undefined): DecisionOutcomeStatus | "all" {
  if (
    value === "pending" ||
    value === "in_progress" ||
    value === "done" ||
    value === "reversed"
  ) {
    return value;
  }
  return "all";
}
