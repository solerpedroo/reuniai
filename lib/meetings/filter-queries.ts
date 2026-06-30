import type { createClient } from "@/lib/supabase/server";
import type { Meeting, MeetingPlatform, MeetingStatus } from "@/lib/supabase/types";
import { getMeetingDurationMs } from "@/lib/meetings/types";
import type { MeetingsCursor } from "@/lib/meetings/queries";
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

async function applyAsyncFilters(
  supabase: Client,
  meetings: Meeting[],
  filters: MeetingListFilters
): Promise<Meeting[]> {
  let result = meetings;

  if (filters.tagId) {
    const allowed = await getMeetingIdsByTag(supabase, filters.tagId);
    result = result.filter((m) => allowed.has(m.id));
  }

  if (filters.participant?.trim()) {
    const allowed = await getMeetingIdsByParticipant(supabase, filters.participant);
    result = result.filter((m) => allowed.has(m.id));
  }

  if (filters.openActionsOnly) {
    const allowed = await getMeetingIdsWithOpenActions(supabase);
    result = result.filter((m) => allowed.has(m.id));
  }

  return applyDurationFilters(result, filters);
}

export type FilteredMeetingsPage = {
  meetings: MeetingWithTags[];
  nextCursor: MeetingsCursor | null;
};

export async function getFilteredMeetingsPaginated(
  supabase: Client,
  filters: MeetingListFilters = {},
  options: { limit?: number; cursor?: MeetingsCursor } = {}
): Promise<FilteredMeetingsPage> {
  const limit = options.limit ?? 50;
  const batchSize = Math.max(limit * 3, 50);
  const maxBatches = 8;

  let dbCursor = options.cursor;
  const matched: Meeting[] = [];
  let batches = 0;

  while (matched.length <= limit && batches < maxBatches) {
    batches += 1;

    let query = supabase
      .from("meetings")
      .select("*")
      .order("started_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(batchSize);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.platform) query = query.eq("platform", filters.platform);

    if (dbCursor) {
      const { startedAt, id } = dbCursor;
      query = query.or(`started_at.lt.${startedAt},and(started_at.eq.${startedAt},id.lt.${id})`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const batch = (data ?? []) as Meeting[];
    if (batch.length === 0) break;

    const filtered = await applyAsyncFilters(supabase, batch, filters);
    for (const meeting of filtered) {
      if (!matched.some((m) => m.id === meeting.id)) {
        matched.push(meeting);
      }
    }

    const last = batch[batch.length - 1]!;
    dbCursor = { startedAt: last.started_at, id: last.id };

    if (batch.length < batchSize) break;
  }

  const hasMore = matched.length > limit;
  const pageMeetings = hasMore ? matched.slice(0, limit) : matched;
  const last = pageMeetings.at(-1);

  const meetingsWithTags = await attachTags(supabase, pageMeetings);

  return {
    meetings: meetingsWithTags,
    nextCursor:
      hasMore && last
        ? { startedAt: last.started_at, id: last.id }
        : null,
  };
}

export async function getFilteredMeetings(
  supabase: Client,
  filters: MeetingListFilters = {},
  limit = 50
): Promise<MeetingWithTags[]> {
  const page = await getFilteredMeetingsPaginated(supabase, filters, { limit });
  return page.meetings;
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
