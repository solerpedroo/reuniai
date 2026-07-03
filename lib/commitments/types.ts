import type { Database } from "@/lib/supabase/database.types";

export type VerbalCommitmentStatus = Database["public"]["Enums"]["verbal_commitment_status"];
export type CommitmentDirection = Database["public"]["Enums"]["commitment_direction"];

export type VerbalCommitmentRow = {
  id: string;
  text: string;
  direction: CommitmentDirection;
  status: VerbalCommitmentStatus;
  counterparty: string | null;
  due_date: string | null;
  source_quote: string | null;
  meeting_id: string;
  meetingTitle: string | null;
  created_at: string;
};

export type CommitmentsHub = {
  items: VerbalCommitmentRow[];
  counts: Record<VerbalCommitmentStatus | "all", number>;
};

export const COMMITMENT_STATUS_FILTERS: { value: VerbalCommitmentStatus | "all"; label: string }[] =
  [
    { value: "pending", label: "Pendentes" },
    { value: "overdue", label: "Atrasados" },
    { value: "fulfilled", label: "Cumpridos" },
    { value: "disputed", label: "Disputados" },
  ];

export const DIRECTION_LABELS: Record<CommitmentDirection, string> = {
  i_owe: "Eu devo",
  they_owe: "Me devem",
  mutual: "Mútuo",
};

export function parseCommitmentStatusFilter(
  value: string | undefined
): VerbalCommitmentStatus | "all" {
  if (
    value === "pending" ||
    value === "fulfilled" ||
    value === "overdue" ||
    value === "disputed"
  ) {
    return value;
  }
  return "all";
}
