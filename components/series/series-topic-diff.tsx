import { formatMeetingDate } from "@/lib/meetings/types";
import type { TopicDiffItem } from "@/lib/series/topic-diff";

export function SeriesTopicDiff({ diffs }: { diffs: TopicDiffItem[] }) {
  if (diffs.length === 0) return null;

  return (
    <div className="surface-card mb-6 space-y-4 p-4">
      <h2 className="text-sm font-medium">Evolução de tópicos</h2>
      {diffs.slice(0, 3).map((diff) => (
        <div key={`${diff.fromMeetingId}-${diff.toMeetingId}`} className="rounded-lg border border-border/60 p-3 text-sm">
          <p className="text-xs text-muted-foreground">
            {formatMeetingDate(diff.fromDate)} → {formatMeetingDate(diff.toDate)}
          </p>
          {diff.added.length > 0 && (
            <p className="mt-2">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">+ Novos: </span>
              {diff.added.join(", ")}
            </p>
          )}
          {diff.removed.length > 0 && (
            <p className="mt-1">
              <span className="font-medium text-amber-600 dark:text-amber-400">− Encerrados: </span>
              {diff.removed.join(", ")}
            </p>
          )}
          {diff.added.length === 0 && diff.removed.length === 0 && (
            <p className="mt-2 text-muted-foreground">Tópicos estáveis entre as ocorrências.</p>
          )}
        </div>
      ))}
    </div>
  );
}
