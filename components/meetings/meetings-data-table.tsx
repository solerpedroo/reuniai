"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, MagnifyingGlass, VideoCamera } from "@phosphor-icons/react";
import { BotActions } from "@/components/meetings/bot-actions";
import { MeetingFolderMenu } from "@/components/meetings/meeting-folder-menu";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { StatusBadge } from "@/components/meetings/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MeetingWithTags } from "@/lib/meetings/filter-queries";
import type { FolderWithCount } from "@/lib/folders/queries";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import { MeetingTagBadges } from "@/components/meetings/meeting-tag-badges";
import { ReviewBadge } from "@/components/meetings/review-badge";
import { needsPostCallReview } from "@/lib/meetings/post-call-review";

type SortDir = "asc" | "desc";

export function MeetingsDataTable({
  meetings,
  folders = [],
  initialQuery = "",
  searchMode = false,
  serverFiltered = false,
}: {
  meetings: MeetingWithTags[];
  folders?: FolderWithCount[];
  initialQuery?: string;
  searchMode?: boolean;
  serverFiltered?: boolean;
}) {
  const [search, setSearch] = useState(initialQuery);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const router = useRouter();

  function openMeeting(meetingId: string) {
    router.push(`/reunioes/${meetingId}`);
  }

  const filtered = useMemo(() => {
    if (searchMode || serverFiltered) {
      return [...meetings].sort((a, b) => {
        const diff = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        return sortDir === "asc" ? diff : -diff;
      });
    }

    const term = search.trim().toLowerCase();
    return meetings
      .filter((m) => (term ? m.title.toLowerCase().includes(term) : true))
      .sort((a, b) => {
        const diff = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        return sortDir === "asc" ? diff : -diff;
      });
  }, [meetings, search, sortDir, searchMode, serverFiltered]);

  const hasFilters = search.trim() !== "" || serverFiltered;

  return (
    <div className="space-y-4">
      <div className="surface-toolbar flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={
              searchMode
                ? "Busca ativa (título + transcrição)…"
                : serverFiltered
                  ? "Busca local por título…"
                  : "Buscar por título…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            readOnly={searchMode}
          />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Título</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                >
                  Data
                  {sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                </button>
              </TableHead>
              <TableHead className="hidden sm:table-cell">Plataforma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Duração</TableHead>
              <TableHead className="hidden md:table-cell text-right">Pasta</TableHead>
              <TableHead className="text-right">Bot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-4">
                  <EmptyState
                    icon={VideoCamera}
                    tone={hasFilters ? "default" : "brand"}
                    title={
                      hasFilters
                        ? "Nenhuma reunião corresponde aos filtros"
                        : "Sua biblioteca está vazia"
                    }
                    description={
                      hasFilters
                        ? "Ajuste os filtros ou limpe a busca para ver mais resultados."
                        : "Use Nova reunião para colar um link ou conecte seu calendário nas configurações."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((meeting) => (
                <TableRow
                  key={meeting.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Abrir reunião ${meeting.title}`}
                  className="group cursor-pointer transition-colors hover:bg-brand/5"
                  onClick={() => openMeeting(meeting.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openMeeting(meeting.id);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    <div className="block max-w-[28ch] transition-colors group-hover:text-brand">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{meeting.title}</span>
                        {needsPostCallReview(meeting) && <ReviewBadge />}
                      </div>
                      <MeetingTagBadges tags={meeting.tags} />
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatMeetingDate(meeting.started_at)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <PlatformBadge platform={meeting.platform} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={meeting.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {formatDuration(getMeetingDurationMs(meeting))}
                  </TableCell>
                  <TableCell
                    className="hidden md:table-cell text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MeetingFolderMenu
                      meetingId={meeting.id}
                      folderId={meeting.folderId}
                      folders={folders}
                    />
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <BotActions
                      meetingId={meeting.id}
                      status={meeting.status}
                      recallBotId={meeting.recall_bot_id}
                      preferNativeTranscript={meeting.prefer_native_transcript}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "reunião" : "reuniões"}
        {hasFilters ? ` de ${meetings.length}` : ""}
      </p>
    </div>
  );
}
