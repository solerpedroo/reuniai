import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";

type AdminClient = ReturnType<typeof createAdminClient>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(admin: AdminClient, userId: string, base: string): Promise<string> {
  let slug = base || "entrada";
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const { data } = await admin
      .from("knowledge_entries")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    n += 1;
  }
}

export async function upsertKnowledgeFromMeeting(
  admin: AdminClient,
  meetingId: string
): Promise<number> {
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string; title: string }>();

  if (!meeting) return 0;

  const { data: summary } = await admin
    .from("meeting_summaries")
    .select("executive_summary, topics, decisions")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  if (!summary?.executive_summary) return 0;

  const topics = parseTopics(summary.topics);
  const decisions = parseDecisions(summary.decisions ?? []);
  const tags = topics.map((t) => t.title).filter(Boolean).slice(0, 8);

  const bodyParts = [
    summary.executive_summary,
    topics.length
      ? `\n\n## Tópicos\n${topics.map((t) => `- **${t.title}**: ${t.summary ?? ""}`).join("\n")}`
      : "",
    decisions.length
      ? `\n\n## Decisões\n${decisions.map((d) => `- ${d}`).join("\n")}`
      : "",
    `\n\n_Fonte: reunião "${meeting.title}"_`,
  ];

  const title = meeting.title;
  const slug = await uniqueSlug(admin, meeting.user_id, slugify(title));

  const { data: existing } = await admin
    .from("knowledge_entries")
    .select("id, source_meeting_ids")
    .eq("user_id", meeting.user_id)
    .eq("slug", slug)
    .maybeSingle<{ id: string; source_meeting_ids: string[] }>();

  const meetingIds = existing
    ? [...new Set([...(existing.source_meeting_ids ?? []), meetingId])]
    : [meetingId];

  if (existing) {
    await admin
      .from("knowledge_entries")
      .update({
        title,
        summary: summary.executive_summary.slice(0, 500),
        body: bodyParts.join(""),
        source_meeting_ids: meetingIds,
        tags,
      })
      .eq("id", existing.id);
    return 1;
  }

  await admin.from("knowledge_entries").insert({
    user_id: meeting.user_id,
    title,
    slug,
    summary: summary.executive_summary.slice(0, 500),
    body: bodyParts.join(""),
    source_meeting_ids: meetingIds,
    tags,
  });

  return 1;
}

export async function listKnowledgeEntries(
  admin: AdminClient,
  userId: string,
  limit = 50
) {
  const { data } = await admin
    .from("knowledge_entries")
    .select("id, title, slug, summary, tags, source_meeting_ids, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
