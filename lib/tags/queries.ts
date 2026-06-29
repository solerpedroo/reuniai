import type { createClient } from "@/lib/supabase/server";
import type { Tag } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type TagWithCount = Tag & { meetingCount: number };

export async function getTagsForUser(supabase: Client): Promise<TagWithCount[]> {
  const { data: tags, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  const rows = (tags ?? []) as Tag[];
  if (rows.length === 0) return [];

  const { data: counts, error: countError } = await supabase
    .from("meeting_tags")
    .select("tag_id");

  if (countError) throw countError;

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    const tagId = (row as { tag_id: string }).tag_id;
    countMap.set(tagId, (countMap.get(tagId) ?? 0) + 1);
  }

  return rows.map((tag) => ({
    ...tag,
    meetingCount: countMap.get(tag.id) ?? 0,
  }));
}

export async function getTagsForMeeting(supabase: Client, meetingId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("meeting_tags")
    .select("tag_id, tags(*)")
    .eq("meeting_id", meetingId);

  if (error) throw error;

  return ((data ?? []) as { tags: Tag | null }[])
    .map((row) => row.tags)
    .filter((tag): tag is Tag => tag !== null);
}

export async function getMeetingIdsByTag(supabase: Client, tagId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("meeting_tags")
    .select("meeting_id")
    .eq("tag_id", tagId);

  if (error) throw error;
  return ((data ?? []) as { meeting_id: string }[]).map((row) => row.meeting_id);
}
