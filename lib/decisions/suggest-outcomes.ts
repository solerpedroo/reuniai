import "server-only";

import { z } from "zod";
import { normalizeDecisionKey } from "@/lib/decisions/normalize";
import type { DecisionOutcomeStatus } from "@/lib/decisions/outcome-types";
import { ensureOutcomeRecords } from "@/lib/decisions/outcomes";
import { generateJson } from "@/lib/llm/client";
import { isLlmConfigured } from "@/lib/llm/client";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const SuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        decision_key: z.string(),
        suggested_status: z.enum(["in_progress", "done", "reversed"]),
        reason: z.string(),
      })
    )
    .default([]),
});

export async function syncAndSuggestDecisionOutcomes(
  admin: AdminClient,
  meetingId: string,
  userId: string,
  decisions: string[],
  transcript: string,
  seriesId: string | null
): Promise<void> {
  const normalized = decisions
    .map((text) => ({ text, meetingId }))
    .filter((item) => item.text.trim());

  if (normalized.length === 0) return;

  await ensureOutcomeRecords(admin, userId, normalized);

  if (!isLlmConfigured() || !seriesId) return;

  const keys = normalized.map((d) => normalizeDecisionKey(d.text));
  const { data: openOutcomes } = await admin
    .from("decision_outcomes")
    .select("id, decision_key, decision_text, status")
    .eq("user_id", userId)
    .in("decision_key", keys)
    .in("status", ["pending", "in_progress"]);

  const candidates = (openOutcomes ?? []) as {
    id: string;
    decision_key: string;
    decision_text: string;
    status: DecisionOutcomeStatus;
  }[];

  if (candidates.length === 0) return;

  const { data: seriesMeetings } = await admin
    .from("meetings")
    .select("id")
    .eq("user_id", userId)
    .eq("calendar_recurring_event_id", seriesId)
    .neq("id", meetingId)
    .in("status", ["completed", "partial"])
    .order("started_at", { ascending: false })
    .limit(5);

  if (!seriesMeetings?.length) return;

  const prompt = `Analise se alguma decisão anterior da série parece ter sido cumprida, revertida ou está em andamento com base na transcrição atual.

Decisões em aberto:
${candidates.map((c) => `- [${c.decision_key}] ${c.decision_text} (status: ${c.status})`).join("\n")}

Transcrição atual (trecho):
${transcript.slice(0, 8000)}

Responda JSON com suggestions: array de { decision_key, suggested_status, reason }.
Só sugira quando houver evidência clara. Não altere status automaticamente.`;

  try {
    const raw = await generateJson({
      system:
        "Analise se decisões anteriores foram cumpridas com base na transcrição. Responda JSON com suggestions: array de { decision_key, suggested_status, reason }. PT-BR nos reasons.",
      user: prompt,
    });
    const parsed = SuggestionSchema.parse(raw);
    for (const suggestion of parsed.suggestions) {
      const match = candidates.find((c) => c.decision_key === suggestion.decision_key);
      if (!match) continue;

      await admin
        .from("decision_outcomes")
        .update({
          suggested_status: suggestion.suggested_status,
          suggested_at: new Date().toISOString(),
          suggested_meeting_id: meetingId,
        })
        .eq("id", match.id);

      await admin.from("decision_outcome_events").insert({
        outcome_id: match.id,
        meeting_id: meetingId,
        event_type: "suggestion",
        detail: suggestion.reason,
      });
    }
  } catch (err) {
    console.error("Falha ao sugerir outcomes de decisões (não bloqueante):", err);
  }
}
