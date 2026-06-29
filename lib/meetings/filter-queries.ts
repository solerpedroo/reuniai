import type { createClient } from "@/lib/supabase/server";
import type { Meeting, MeetingPlatform, MeetingStatus } from "@/lib/supabase/types";
import { getMeetingDurationMs } from "@/lib/meetings/types";
import type { Tag } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type MeetingListFilters = {
  status?: MeetingStatus;
  platform?: MeetingPlatform;
  tagId?: string;
  participant?: string;
  minDurationMin?: number;
  maxDurationMin?: number;
  openActionsOnly?: boolean;
};

export type MeetingWithTags = Meeting & { tags: Tag[] };

export type SavedView = {
  id: string;
  name: string;
  filters: MeetingListFilters;
};

async function getMeetingIdsWithOpenActions(supabase: Client): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("action_items")
    .select("meeting_id")
    .eq("status", "open");

  if (error) throw error;
  return new Set(((data ?? []) as { meeting_id: string }[]).map((row) => row.meeting_id));
}

async function getMeetingIdsByParticipant(
  supabase: Client,
  participant: string
): Promise<Set<string>> {
  const pattern = `%${participant.trim()}%`;
  const [emailRes, nameRes] = await Promise.all([
    supabase.from("participants").select("meeting_id").ilike("email", pattern),
    supabase.from("participants").select("meeting_id").ilike("name", pattern),
  ]);

  if (emailRes.error) throw emailRes.error;
  if (nameRes.error) throw nameRes.error;

  const ids = [
    ...((emailRes.data ?? []) as { meeting_id: string }[]).map((r) => r.meeting_id),
    ...((nameRes.data ?? []) as { meeting_id: string }[]).map((r) => r.meeting_id),
  ];
  return new Set(ids);
}

async function getMeetingIdsByTag(supabase: Client, tagId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("meeting_tags")
    .select("meeting_id")
    .eq("tag_id", tagId);

  if (error) throw error;
  return new Set(((data ?? []) as { meeting_id: string }[]).map((row) => row.meeting_id));
}

async function attachTags(
  supabase: Client,
  meetings: Meeting[]
): Promise<MeetingWithTags[]> {
  if (meetings.length === 0) return [];

  const ids = meetings.map((m) => m.id);
  const { data, error } = await supabase
    .from("meeting_tags")
    .select("meeting_id, tags(*)")
    .in("meeting_id", ids);

  if (error) throw error;

  const tagMap = new Map<string, Tag[]>();
  for (const row of (data ?? []) as { meeting_id: string; tags: Tag | null }[]) {
    if (!row.tags) continue;
    const list = tagMap.get(row.meeting_id) ?? [];
    list.push(row.tags);
    tagMap.set(row.meeting_id, list);
  }

  return meetings.map((meeting) => ({
    ...meeting,
    tags: tagMap.get(meeting.id) ?? [],
  }));
}

function applyDurationFilters(meetings: Meeting[], filters: MeetingListFilters): Meeting[] {
  return meetings.filter((meeting) => {
    const durationMs = getMeetingDurationMs(meeting) ?? 0;
    const durationMin = durationMs / 60_000;

    if (filters.minDurationMin !== undefined && durationMin < filters.minDurationMin) {
      return false;
    }
    if (filters.maxDurationMin !== undefined && durationMin > filters.maxDurationMin) {
      return false;
    }
    return true;
  });
}

export async function getFilteredMeetings(
  supabase: Client,
  filters: MeetingListFilters = {},
  limit = 50
): Promise<MeetingWithTags[]> {
  let query = supabase
    .from("meetings")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit * 3);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.platform) query = query.eq("platform", filters.platform);

  const { data, error } = await query;
  if (error) throw error;

  let meetings = (data ?? []) as Meeting[];

  if (filters.tagId) {
    const allowed = await getMeetingIdsByTag(supabase, filters.tagId);
    meetings = meetings.filter((m) => allowed.has(m.id));
  }

  if (filters.participant?.trim()) {
    const allowed = await getMeetingIdsByParticipant(supabase, filters.participant);
    meetings = meetings.filter((m) => allowed.has(m.id));
  }

  if (filters.openActionsOnly) {
    const allowed = await getMeetingIdsWithOpenActions(supabase);
    meetings = meetings.filter((m) => allowed.has(m.id));
  }

  meetings = applyDurationFilters(meetings, filters).slice(0, limit);
  return attachTags(supabase, meetings);
}

export async function attachTagsToMeetings(
  supabase: Client,
  meetings: Meeting[]
): Promise<MeetingWithTags[]> {
  return attachTags(supabase, meetings);
}

export async function getSavedViews(supabase: Client): Promise<SavedView[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("saved_views")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  const views = (data as { saved_views?: SavedView[] } | null)?.saved_views;
  return Array.isArray(views) ? views : [];
}
