import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { MeetingsDataTable } from "@/components/meetings/meetings-data-table";
import { Button } from "@/components/ui/button";
import {
  getMeetingsForUserPaginated,
  searchMeetings,
  type MeetingsCursor,
} from "@/lib/meetings/queries";
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

export default async function ReunioesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const { q, cursor: cursorParam } = await searchParams;
  const supabase = await createClient();
  const cursor = parseCursor(cursorParam);

  const page = q?.trim()
    ? await searchMeetings(supabase, q, { limit: PAGE_SIZE, cursor })
    : await getMeetingsForUserPaginated(supabase, { limit: PAGE_SIZE, cursor });

  const nextHref =
    page.nextCursor &&
    `/reunioes?${new URLSearchParams({
      ...(q?.trim() ? { q: q.trim() } : {}),
      cursor: encodeCursor(page.nextCursor),
    }).toString()}`;

  return (
    <div>
      <PageHeader
        title="Reuniões"
        description="Todas as reuniões gravadas pelo ReuniAI Bot, com status e filtros."
        meta="Biblioteca"
      />

      <MeetingsDataTable
        meetings={page.meetings}
        initialQuery={q ?? ""}
        searchMode={Boolean(q?.trim())}
      />

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
