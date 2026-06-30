import "server-only";

import type { ActionItem } from "@/lib/supabase/types";
import { parseTopics } from "@/lib/meetings/insights";
import { computeTopicDiff } from "@/lib/series/topic-diff";
import { generateJson, isLlmConfigured } from "@/lib/llm/client";
import type { MeetingSummary } from "@/lib/supabase/types";

export type ActionItemDiff = {
  resolved: string[];
  newItems: string[];
  unchanged: string[];
};

export function computeActionItemDiff(
  previous: Pick<ActionItem, "title" | "status">[],
  current: Pick<ActionItem, "title" | "status">[]
): ActionItemDiff {
  const prevOpen = new Set(
    previous.filter((i) => i.status === "open").map((i) => i.title.toLowerCase())
  );
  const currOpen = new Set(
    current.filter((i) => i.status === "open").map((i) => i.title.toLowerCase())
  );
  const currAll = new Map(current.map((i) => [i.title.toLowerCase(), i.title]));
  const prevAll = new Map(previous.map((i) => [i.title.toLowerCase(), i.title]));

  const resolved = [...prevOpen].filter((t) => !currOpen.has(t)).map((t) => prevAll.get(t) ?? t);
  const newItems = [...currOpen].filter((t) => !prevOpen.has(t)).map((t) => currAll.get(t) ?? t);
  const unchanged = [...currOpen].filter((t) => prevOpen.has(t)).map((t) => currAll.get(t) ?? t);

  return { resolved, newItems, unchanged };
}

export type MeetingCompareInput = {
  meetingA: { id: string; title: string; startedAt: string; summary: MeetingSummary | null };
  meetingB: { id: string; title: string; startedAt: string; summary: MeetingSummary | null };
  actionItemsA: Pick<ActionItem, "title" | "status">[];
  actionItemsB: Pick<ActionItem, "title" | "status">[];
};

export type MeetingCompareResult = {
  topicDiff: ReturnType<typeof computeTopicDiff>;
  actionItemDiff: ActionItemDiff;
  narrative: string | null;
};

export async function compareMeetings(input: MeetingCompareInput): Promise<MeetingCompareResult> {
  const topicDiff = computeTopicDiff(
    {
      meetingId: input.meetingA.id,
      startedAt: input.meetingA.startedAt,
      summary: input.meetingA.summary,
    },
    {
      meetingId: input.meetingB.id,
      startedAt: input.meetingB.startedAt,
      summary: input.meetingB.summary,
    }
  );

  const actionItemDiff = computeActionItemDiff(input.actionItemsA, input.actionItemsB);

  let narrative: string | null = null;
  if (isLlmConfigured()) {
    const topicsA = parseTopics(input.meetingA.summary?.topics ?? [])
      .map((t) => t.title)
      .join(", ");
    const topicsB = parseTopics(input.meetingB.summary?.topics ?? [])
      .map((t) => t.title)
      .join(", ");

    try {
      const result = (await generateJson({
        system:
          "Você compara duas ocorrências da mesma série de reuniões. Responda em português do Brasil.",
        user: JSON.stringify({
          meeting_a: { title: input.meetingA.title, date: input.meetingA.startedAt, topics: topicsA },
          meeting_b: { title: input.meetingB.title, date: input.meetingB.startedAt, topics: topicsB },
          topics_added: topicDiff.added,
          topics_removed: topicDiff.removed,
          action_items_resolved: actionItemDiff.resolved,
          action_items_new: actionItemDiff.newItems,
          instruction:
            'Gere um parágrafo curto (3-5 frases) sobre "o que mudou" entre as duas reuniões. JSON: { "narrative": "..." }',
        }),
      })) as { narrative?: string };
      narrative = result.narrative ?? null;
    } catch (err) {
      console.error("Falha ao gerar narrativa de comparação:", err);
    }
  }

  return { topicDiff, actionItemDiff, narrative };
}
