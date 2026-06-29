import "server-only";

import { z } from "zod";
import { generateJson, isLlmConfigured } from "@/lib/llm/client";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const TagSuggestionSchema = z.object({
  tags: z.array(z.string().max(40)).max(3),
});

const TAG_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"];

export async function suggestAndApplyTags(
  admin: AdminClient,
  meetingId: string
): Promise<void> {
  if (!isLlmConfigured()) return;

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return;

  const { data: summary } = await admin
    .from("meeting_summaries")
    .select("executive_summary")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  if (!summary?.executive_summary) return;

  const raw = await generateJson({
    system:
      "Sugira 2-3 tags curtas em português para categorizar a reunião. Retorne JSON: { \"tags\": [\"tag1\", \"tag2\"] }. Sem hashtags.",
    user: `Título: ${meeting.title}\nResumo: ${summary.executive_summary}`,
  });

  const parsed = TagSuggestionSchema.safeParse(raw);
  if (!parsed.success || parsed.data.tags.length === 0) return;

  const tagIds: string[] = [];

  for (const [index, name] of parsed.data.tags.entries()) {
    const normalized = name.trim();
    if (!normalized) continue;

    const { data: existing } = await admin
      .from("tags")
      .select("id")
      .eq("user_id", meeting.user_id)
      .ilike("name", normalized)
      .maybeSingle();

    if (existing) {
      tagIds.push((existing as { id: string }).id);
      continue;
    }

    const { data: created, error } = await admin
      .from("tags")
      .insert({
        user_id: meeting.user_id,
        name: normalized,
        color: TAG_COLORS[index % TAG_COLORS.length]!,
      })
      .select("id")
      .single();

    if (!error && created) tagIds.push((created as { id: string }).id);
  }

  if (tagIds.length === 0) return;

  await admin.from("meeting_tags").delete().eq("meeting_id", meetingId);

  const rows = tagIds.map((tagId) => ({ meeting_id: meetingId, tag_id: tagId }));
  await admin.from("meeting_tags").insert(rows);
}
