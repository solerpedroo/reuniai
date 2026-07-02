import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { JoinMeetingDialog } from "@/components/meetings/join-meeting-dialog";
import { MeetingsDataTable } from "@/components/meetings/meetings-data-table";
import { MeetingsFilterBar } from "@/components/meetings/meetings-filter-bar";
import { MeetingsFoldersBar } from "@/components/meetings/meetings-folders-bar";
import { Button } from "@/components/ui/button";
import { getFoldersForUser, getMeetingIdsWithoutFolder } from "@/lib/folders/queries";
import {
  attachTagsToMeetings,
  filterMeetingsByFolder,
  getFilteredMeetingsPaginated,
  getSavedViews,
  type MeetingListFilters,
  type MeetingWithTags,
} from "@/lib/meetings/filter-queries";
import {
  getMeetingsForUserPaginated,
  searchMeetings,
  type MeetingsCursor,
} from "@/lib/meetings/queries";
import { getTagsForUser } from "@/lib/tags/queries";
import type { MeetingPlatform, MeetingStatus } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

function parseCursor(value: string | undefined): MeetingsCursor | undefined {
  if (!value) return undefined;
  const [startedAt, id] = value.split("|");
  if (!startedAt || !id) return undefined;
  return { startedAt, id };
}

function encodeCursor(cursor: MeetingsCursor): string {
  return `${cursor.startedAt}|${cursor.id}`;
}

function buildListHref(
  params: Record<string, string | undefined>,
  cursor?: MeetingsCursor
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) search.set(key, value.trim());
  }
  if (cursor) search.set("cursor", encodeCursor(cursor));
  const query = search.toString();
  return query ? `/reunioes?${query}` : "/reunioes";
}

function filterParamsFromSearch(params: {
  status?: string;
  platform?: string;
  tag?: string;
  pasta?: string;
  participant?: string;
  minDuration?: string;
  maxDuration?: string;
  openActions?: string;
}): Record<string, string | undefined> {
  return {
    status: params.status,
    platform: params.platform,
    tag: params.tag,
    pasta: params.pasta,
    participant: params.participant,
    minDuration: params.minDuration,
    maxDuration: params.maxDuration,
    openActions: params.openActions,
  };
}

function parseFilters(params: {
  status?: string;
  platform?: string;
  tag?: string;
  pasta?: string;
  participant?: string;
  minDuration?: string;
  maxDuration?: string;
  openActions?: string;
}): MeetingListFilters {
  return {
    status: params.status as MeetingStatus | undefined,
    platform: params.platform as MeetingPlatform | undefined,
    tagId: params.tag,
    folderId: params.pasta,
    participant: params.participant,
    minDurationMin: params.minDuration ? Number(params.minDuration) : undefined,
    maxDurationMin: params.maxDuration ? Number(params.maxDuration) : undefined,
    openActionsOnly: params.openActions === "1",
  };
}

function hasAdvancedFilters(filters: MeetingListFilters): boolean {
  return Boolean(
    filters.status ||
      filters.platform ||
      filters.tagId ||
      filters.folderId ||
      filters.participant?.trim() ||
      filters.minDurationMin !== undefined ||
      filters.maxDurationMin !== undefined ||
      filters.openActionsOnly
  );
}

export default async function ReunioesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cursor?: string;
    join?: string;
    status?: string;
    platform?: string;
    tag?: string;
    pasta?: string;
    participant?: string;
    minDuration?: string;
    maxDuration?: string;
    openActions?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const cursor = parseCursor(params.cursor);
  const filters = parseFilters(params);
  const advanced = hasAdvancedFilters(filters);

  const [tags, savedViews, folders, unassignedIds] = await Promise.all([
    getTagsForUser(supabase),
    getSavedViews(supabase),
    getFoldersForUser(supabase),
    getMeetingIdsWithoutFolder(supabase),
  ]);

  const unassignedCount = unassignedIds.size;

  let meetings: MeetingWithTags[];
  let nextCursor: MeetingsCursor | null = null;

  if (params.q?.trim()) {
    const page = await searchMeetings(supabase, params.q, {
      limit: PAGE_SIZE,
      cursor,
    });
    const filtered = filters.folderId
      ? await filterMeetingsByFolder(supabase, page.meetings, filters.folderId)
      : page.meetings;
    meetings = await attachTagsToMeetings(supabase, filtered);
    nextCursor = page.nextCursor;
  } else if (advanced) {
    const page = await getFilteredMeetingsPaginated(supabase, filters, {
      limit: PAGE_SIZE,
      cursor,
    });
    meetings = page.meetings;
    nextCursor = page.nextCursor;
  } else {
    const page = await getMeetingsForUserPaginated(supabase, {
      limit: PAGE_SIZE,
      cursor,
    });
    meetings = await attachTagsToMeetings(supabase, page.meetings);
    nextCursor = page.nextCursor;
  }

  const filterQuery = filterParamsFromSearch(params);

  const nextHref = nextCursor
    ? params.q?.trim()
      ? buildListHref({ ...filterQuery, q: params.q.trim() }, nextCursor)
      : advanced
        ? buildListHref(filterQuery, nextCursor)
        : buildListHref({}, nextCursor)
    : null;

  return (
    <div>
      <PageHeader
        title="Reuniões"
        description="Todas as reuniões gravadas pelo ReuniAI — da agenda ou via link manual."
        meta="Biblioteca"
        actions={<JoinMeetingDialog defaultOpen={params.join === "1"} />}
      />

      <div className="space-y-4">
        <Suspense fallback={null}>
          <MeetingsFoldersBar
            folders={folders}
            activeFolderId={filters.folderId}
            unassignedCount={unassignedCount}
          />
        </Suspense>

        <Suspense fallback={null}>
          <MeetingsFilterBar
            tags={tags}
            savedViews={savedViews}
            initialFilters={filters}
          />
        </Suspense>

        <MeetingsDataTable
          meetings={meetings}
          folders={folders}
          initialQuery={params.q ?? ""}
          searchMode={Boolean(params.q?.trim())}
          serverFiltered={advanced || Boolean(filters.folderId && params.q?.trim())}
        />
      </div>

      {nextHref && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" asChild>
            <Link href={nextHref}>Carregar mais</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
