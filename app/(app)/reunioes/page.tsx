import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { JoinMeetingDialog } from "@/components/meetings/join-meeting-dialog";
import { MeetingsDataTable } from "@/components/meetings/meetings-data-table";
import { MeetingsFilterBar } from "@/components/meetings/meetings-filter-bar";
import { Button } from "@/components/ui/button";
import {
  attachTagsToMeetings,
  getFilteredMeetings,
  getSavedViews,
  type MeetingListFilters,
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

function parseFilters(params: {
  status?: string;
  platform?: string;
  tag?: string;
  participant?: string;
  minDuration?: string;
  maxDuration?: string;
  openActions?: string;
}): MeetingListFilters {
  return {
    status: params.status as MeetingStatus | undefined,
    platform: params.platform as MeetingPlatform | undefined,
    tagId: params.tag,
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

  const [tags, savedViews] = await Promise.all([
    getTagsForUser(supabase),
    getSavedViews(supabase),
  ]);

  let meetings;
  let nextCursor: MeetingsCursor | null = null;

  if (params.q?.trim()) {
    const page = await searchMeetings(supabase, params.q, {
      limit: PAGE_SIZE,
      cursor,
    });
    meetings = await attachTagsToMeetings(supabase, page.meetings);
    nextCursor = page.nextCursor;
  } else if (advanced) {
    meetings = await getFilteredMeetings(supabase, filters, PAGE_SIZE);
  } else {
    const page = await getMeetingsForUserPaginated(supabase, {
      limit: PAGE_SIZE,
      cursor,
    });
    meetings = await attachTagsToMeetings(supabase, page.meetings);
    nextCursor = page.nextCursor;
  }

  const nextHref =
    nextCursor &&
    `/reunioes?${new URLSearchParams({
      ...(params.q?.trim() ? { q: params.q.trim() } : {}),
      cursor: encodeCursor(nextCursor),
    }).toString()}`;

  return (
    <div>
      <PageHeader
        title="Reuniões"
        description="Todas as reuniões gravadas pelo ReuniAI Bot — da agenda ou via link manual."
        meta="Biblioteca"
        actions={<JoinMeetingDialog defaultOpen={params.join === "1"} />}
      />

      <div className="space-y-4">
        <Suspense fallback={null}>
          <MeetingsFilterBar
            tags={tags}
            savedViews={savedViews}
            initialFilters={filters}
          />
        </Suspense>

        <MeetingsDataTable
          meetings={meetings}
          initialQuery={params.q ?? ""}
          searchMode={Boolean(params.q?.trim())}
          serverFiltered={advanced}
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
