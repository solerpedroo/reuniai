"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, MagnifyingGlass, VideoCamera } from "@phosphor-icons/react";
import { BotActions } from "@/components/meetings/bot-actions";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { StatusBadge } from "@/components/meetings/status-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Meeting, MeetingPlatform, MeetingStatus } from "@/lib/supabase/types";
import {
  MEETING_PLATFORMS,
  MEETING_STATUSES,
  PLATFORM_LABELS,
  STATUS_LABELS,
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";

type SortDir = "asc" | "desc";

export function MeetingsDataTable({
  meetings,
  initialQuery = "",
  searchMode = false,
}: {
  meetings: Meeting[];
  initialQuery?: string;
  searchMode?: boolean;
}) {
  const [search, setSearch] = useState(initialQuery);
  const [status, setStatus] = useState<MeetingStatus | "all">("all");
  const [platform, setPlatform] = useState<MeetingPlatform | "all">("all");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    if (searchMode) {
      return meetings
        .filter((m) => (status === "all" ? true : m.status === status))
        .filter((m) => (platform === "all" ? true : m.platform === platform))
        .sort((a, b) => {
          const diff = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
          return sortDir === "asc" ? diff : -diff;
        });
    }

    const term = search.trim().toLowerCase();
    return meetings
      .filter((m) => (status === "all" ? true : m.status === status))
      .filter((m) => (platform === "all" ? true : m.platform === platform))
      .filter((m) => (term ? m.title.toLowerCase().includes(term) : true))
      .sort((a, b) => {
        const diff = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
        return sortDir === "asc" ? diff : -diff;
      });
  }, [meetings, search, status, platform, sortDir, searchMode]);

  const hasFilters = search.trim() !== "" || status !== "all" || platform !== "all";

  return (
    <div className="space-y-4">
      <div className="surface-toolbar flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={searchMode ? "Busca ativa (título + transcrição)…" : "Buscar por título…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            readOnly={searchMode}
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as MeetingStatus | "all")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {MEETING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platform} onValueChange={(v) => setPlatform(v as MeetingPlatform | "all")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plataformas</SelectItem>
            {MEETING_PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              <TableHead className="text-right">Bot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <VideoCamera size={28} className="text-muted-foreground/60" aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      {hasFilters
                        ? "Nenhuma reunião corresponde aos filtros."
                        : "Nenhuma reunião ainda. Use Nova reunião para colar um link ou conecte seu calendário."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((meeting) => (
                <TableRow
                  key={meeting.id}
                  className="group cursor-pointer transition-colors hover:bg-brand/5"
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/reunioes/${meeting.id}`}
                      className="block max-w-[28ch] truncate transition-colors group-hover:text-brand"
                    >
                      {meeting.title}
                    </Link>
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
                  <TableCell className="text-right">
                    <BotActions meetingId={meeting.id} status={meeting.status} />
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
