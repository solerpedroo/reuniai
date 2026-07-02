export type DecisionPeriod = "7d" | "30d" | "90d";

export const DECISION_PERIODS: { value: DecisionPeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

export type DecisionEntry = {
  id: string;
  text: string;
  meetingId: string;
  meetingTitle: string;
  meetingStartedAt: string;
  seriesId: string | null;
  occurrenceCount: number;
};

export type DecisionRegistry = {
  period: DecisionPeriod;
  totalDecisions: number;
  meetingsWithDecisions: number;
  topRecurring: string | null;
  entries: DecisionEntry[];
};

export function parseDecisionPeriod(value: string | undefined): DecisionPeriod {
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}
