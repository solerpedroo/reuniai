import Link from "next/link";
import { BookmarkSimple, Play } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  formatHighlightTimestamp,
  type HighlightLibraryEntry,
} from "@/lib/meetings/highlights-library";
import { formatMeetingDate } from "@/lib/meetings/types";

export function HighlightsLibraryView({
  entries,
  total,
}: {
  entries: HighlightLibraryEntry[];
  total: number;
}) {
  if (entries.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
        <BookmarkSimple size={32} className="text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Marque momentos importantes na transcrição de uma reunião — eles aparecerão aqui.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/reunioes">Ver reuniões</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total} destaque{total === 1 ? "" : "s"} em todas as reuniões
      </p>

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/reunioes/${entry.meeting_id}?t=${entry.start_ms}`}
              className="surface-card flex items-start gap-3 p-4 transition-colors hover:border-brand/30"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Play size={16} weight="fill" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{entry.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {entry.meeting_title} · {formatMeetingDate(entry.meeting_started_at)}
                </span>
                <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                  {formatHighlightTimestamp(entry.start_ms, entry.end_ms)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
