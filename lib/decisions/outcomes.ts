import "server-only";

import { normalizeDecisionKey } from "@/lib/decisions/normalize";
import type {
  DecisionOutcomeEvent,
  DecisionOutcomeRow,
  DecisionOutcomeStatus,
} from "@/lib/decisions/outcome-types";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createAdminClient>;
type Client = Awaited<ReturnType<typeof createClient>>;

export async function getOutcomeMapForUser(
  supabase: Client
): Promise<Map<string, DecisionOutcomeRow>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Map();

  const { data, error } = await supabase
    .from("decision_outcomes")
    .select("*")
    .eq("user_id", user.id);

  if (error) throw error;

  const map = new Map<string, DecisionOutcomeRow>();
  for (const row of (data ?? []) as DecisionOutcomeRow[]) {
    map.set(row.decision_key, row);
  }
  return map;
}

export async function ensureOutcomeRecords(
  admin: AdminClient,
  userId: string,
  decisions: { text: string; meetingId: string }[]
): Promise<void> {
  for (const item of decisions) {
    const key = normalizeDecisionKey(item.text);
    if (!key) continue;

    const { data: existing } = await admin
      .from("decision_outcomes")
      .select("id, first_meeting_id")
      .eq("user_id", userId)
      .eq("decision_key", key)
      .maybeSingle<{ id: string; first_meeting_id: string | null }>();

    if (existing) {
      await admin
        .from("decision_outcomes")
        .update({
          decision_text: item.text.trim(),
          last_meeting_id: item.meetingId,
        })
        .eq("id", existing.id);

      await admin.from("decision_outcome_events").insert({
        outcome_id: existing.id,
        meeting_id: item.meetingId,
        event_type: "mentioned",
        detail: item.text.trim(),
      });
      continue;
    }

    const { data: created, error } = await admin
      .from("decision_outcomes")
      .insert({
        user_id: userId,
        decision_key: key,
        decision_text: item.text.trim(),
        first_meeting_id: item.meetingId,
        last_meeting_id: item.meetingId,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error || !created) continue;

    await admin.from("decision_outcome_events").insert({
      outcome_id: created.id,
      meeting_id: item.meetingId,
      event_type: "raised",
      detail: item.text.trim(),
    });
  }
}

export async function updateOutcomeStatus(
  admin: AdminClient,
  userId: string,
  decisionKey: string,
  status: DecisionOutcomeStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row, error: fetchError } = await admin
    .from("decision_outcomes")
    .select("id")
    .eq("user_id", userId)
    .eq("decision_key", decisionKey)
    .maybeSingle<{ id: string }>();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!row) return { ok: false, error: "Decisão não encontrada" };

  const { error } = await admin
    .from("decision_outcomes")
    .update({
      status,
      suggested_status: null,
      suggested_at: null,
      suggested_meeting_id: null,
    })
    .eq("id", row.id);

  if (error) return { ok: false, error: error.message };

  await admin.from("decision_outcome_events").insert({
    outcome_id: row.id,
    event_type: "status_changed",
    detail: status,
  });

  return { ok: true };
}

export async function respondToOutcomeSuggestion(
  admin: AdminClient,
  userId: string,
  decisionKey: string,
  action: "accept" | "reject"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row, error: fetchError } = await admin
    .from("decision_outcomes")
    .select("id, suggested_status")
    .eq("user_id", userId)
    .eq("decision_key", decisionKey)
    .maybeSingle<{ id: string; suggested_status: DecisionOutcomeStatus | null }>();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!row?.suggested_status) return { ok: false, error: "Nenhuma sugestão pendente" };

  if (action === "reject") {
    const { error } = await admin
      .from("decision_outcomes")
      .update({
        suggested_status: null,
        suggested_at: null,
        suggested_meeting_id: null,
      })
      .eq("id", row.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await admin
    .from("decision_outcomes")
    .update({
      status: row.suggested_status,
      suggested_status: null,
      suggested_at: null,
      suggested_meeting_id: null,
    })
    .eq("id", row.id);

  if (error) return { ok: false, error: error.message };

  await admin.from("decision_outcome_events").insert({
    outcome_id: row.id,
    event_type: "suggestion_accepted",
    detail: row.suggested_status,
  });

  return { ok: true };
}

export async function getOutcomeEvents(
  admin: AdminClient,
  userId: string,
  outcomeId: string
): Promise<DecisionOutcomeEvent[]> {
  const { data: outcome } = await admin
    .from("decision_outcomes")
    .select("id")
    .eq("id", outcomeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!outcome) return [];

  const { data, error } = await admin
    .from("decision_outcome_events")
    .select("*")
    .eq("outcome_id", outcomeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DecisionOutcomeEvent[];
}

export function computeStaleDays(updatedAt: string, now = new Date()): number {
  const diff = now.getTime() - Date.parse(updatedAt);
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function computeCompletionRate(
  outcomes: DecisionOutcomeRow[]
): { rate: number | null; staleCount: number } {
  if (outcomes.length === 0) return { rate: null, staleCount: 0 };

  const done = outcomes.filter((o) => o.status === "done").length;
  const staleCount = outcomes.filter(
    (o) => o.status === "pending" && computeStaleDays(o.updated_at) > 30
  ).length;

  return { rate: Math.round((done / outcomes.length) * 100), staleCount };
}
