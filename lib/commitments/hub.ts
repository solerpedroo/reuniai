import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Client = Awaited<ReturnType<typeof createClient>>;

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function effectiveStatus(
  row: Pick<VerbalCommitmentRow, "status" | "due_date">
): VerbalCommitmentStatus {
  if (row.status === "pending" && row.due_date && row.due_date < todayIso()) {
    return "overdue";
  }
  return row.status;
}

export async function getCommitmentsHub(
  supabase: Client,
  options: { status?: VerbalCommitmentStatus | "all" } = {}
): Promise<CommitmentsHub> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      items: [],
      counts: { all: 0, pending: 0, fulfilled: 0, overdue: 0, disputed: 0 },
    };
  }

  const { data: rows } = await supabase
    .from("verbal_commitments")
    .select(
      "id, text, direction, status, counterparty, due_date, source_quote, meeting_id, created_at, meetings(title)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<
      {
        id: string;
        text: string;
        direction: CommitmentDirection;
        status: VerbalCommitmentStatus;
        counterparty: string | null;
        due_date: string | null;
        source_quote: string | null;
        meeting_id: string;
        created_at: string;
        meetings: { title: string } | null;
      }[]
    >();

  const mapped: VerbalCommitmentRow[] = (rows ?? []).map((row) => ({
    id: row.id,
    text: row.text,
    direction: row.direction,
    status: effectiveStatus(row),
    counterparty: row.counterparty,
    due_date: row.due_date,
    source_quote: row.source_quote,
    meeting_id: row.meeting_id,
    meetingTitle: row.meetings?.title ?? null,
    created_at: row.created_at,
  }));

  const counts: CommitmentsHub["counts"] = {
    all: mapped.length,
    pending: 0,
    fulfilled: 0,
    overdue: 0,
    disputed: 0,
  };

  for (const item of mapped) {
    counts[item.status] += 1;
  }

  const statusFilter = options.status ?? "all";
  const items =
    statusFilter === "all" ? mapped : mapped.filter((item) => item.status === statusFilter);

  return { items, counts };
}
