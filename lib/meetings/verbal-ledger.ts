import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { isLlmConfigured } from "@/lib/llm/client";
import { extractVerbalCommitments } from "@/lib/llm/verbal-ledger";

type AdminClient = ReturnType<typeof createAdminClient>;
type VerbalCommitmentInsert = Database["public"]["Tables"]["verbal_commitments"]["Insert"];

function resolveStatus(
  dueDate: string | null,
  referenceIso: string
): Database["public"]["Enums"]["verbal_commitment_status"] {
  if (!dueDate) return "pending";
  const ref = referenceIso.slice(0, 10);
  if (dueDate < ref) return "overdue";
  return "pending";
}

/**
 * Extrai compromissos verbais da transcrição e persiste em `verbal_commitments`
 * (separado de `action_items`).
 */
export async function extractAndSaveVerbalLedger(
  admin: AdminClient,
  meetingId: string,
  transcript: string
): Promise<number> {
  if (!isLlmConfigured()) return 0;

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, started_at, ended_at")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return 0;

  const referenceDateIso = meeting.ended_at ?? meeting.started_at;

  await admin.from("verbal_commitments").delete().eq("meeting_id", meetingId);

  const result = await extractVerbalCommitments({
    transcript,
    meetingTitle: meeting.title,
    referenceDateIso,
  });

  if (result.commitments.length === 0) return 0;

  const rows: VerbalCommitmentInsert[] = result.commitments.map((item) => ({
    meeting_id: meetingId,
    user_id: meeting.user_id,
    text: item.text,
    direction: item.direction,
    counterparty: item.counterparty,
    due_date: item.due_date,
    source_quote: item.source_quote ?? null,
    status: resolveStatus(item.due_date, referenceDateIso),
  }));

  const { error } = await admin.from("verbal_commitments").insert(rows);
  if (error) throw error;

  return rows.length;
}
