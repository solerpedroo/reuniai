"use client";

import { useRouter } from "next/navigation";
import {
  INBOX_FILTER_LABELS,
  type InboxCounts,
  type InboxFilter,
  type InboxFilterOptions,
  type InboxQuery,
  inboxHref,
} from "@/lib/meetings/action-items-inbox";
import { cn } from "@/lib/utils";
import Link from "next/link";

type TasksInboxFiltersProps = {
  query: InboxQuery;
  counts: InboxCounts;
  options: InboxFilterOptions;
};

function scopeHref(query: InboxQuery, patch: Partial<InboxQuery>): string {
  return inboxHref({ ...query, ...patch });
}

export function TasksInboxFilters({ query, counts, options }: TasksInboxFiltersProps) {
  const router = useRouter();
  const hasScope = Boolean(query.meetingId || query.assignee || query.tagId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(INBOX_FILTER_LABELS) as InboxFilter[]).map((key) => {
          const active = key === query.filter;
          const count = counts[key];
          return (
            <Link
              key={key}
              href={inboxHref({ ...query, filter: key })}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand/30 bg-brand/10 text-brand"
                  : "border-border bg-background text-muted-foreground hover:border-brand/20 hover:text-foreground"
              )}
            >
              {INBOX_FILTER_LABELS[key]}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                    active ? "bg-brand/15" : "bg-muted"
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={query.meetingId ?? ""}
          onChange={(e) => {
            router.push(
              scopeHref(query, { meetingId: e.target.value || undefined })
            );
          }}
          className="h-9 max-w-[220px] truncate rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          aria-label="Filtrar por reunião"
        >
          <option value="">Todas as reuniões</option>
          {options.meetings.map((meeting) => (
            <option key={meeting.id} value={meeting.id}>
              {meeting.title}
            </option>
          ))}
        </select>

        <select
          value={query.assignee ?? ""}
          onChange={(e) => {
            router.push(
              scopeHref(query, { assignee: e.target.value || undefined })
            );
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          aria-label="Filtrar por responsável"
        >
          <option value="">Todos os responsáveis</option>
          {options.assignees.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={query.tagId ?? ""}
          onChange={(e) => {
            router.push(scopeHref(query, { tagId: e.target.value || undefined }));
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          aria-label="Filtrar por tag"
        >
          <option value="">Todas as tags</option>
          {options.tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>

        {hasScope && (
          <Link
            href={inboxHref({ filter: query.filter })}
            className="text-sm font-medium text-brand hover:underline"
          >
            Limpar filtros
          </Link>
        )}
      </div>
    </div>
  );
}
