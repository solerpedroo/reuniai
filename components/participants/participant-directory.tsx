"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ParticipantDirectoryEntry, ParticipantSort } from "@/lib/participants/directory";
import { formatMeetingDateTime } from "@/lib/meetings/types";

const SORT_LABELS: Record<ParticipantSort, string> = {
  recent: "Mais recente",
  meetings: "Mais reuniões",
  tasks: "Mais tarefas abertas",
};

type ParticipantDirectoryProps = {
  participants: ParticipantDirectoryEntry[];
  search: string;
  sort: ParticipantSort;
};

export function ParticipantDirectory({ participants, search, sort }: ParticipantDirectoryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(next: Partial<{ q: string; sort: ParticipantSort }>) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.sort !== undefined) {
      params.set("sort", next.sort);
    }
    const qs = params.toString();
    router.replace(qs ? `/participantes?${qs}` : "/participantes");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            defaultValue={search}
            placeholder="Buscar por nome ou email…"
            className="pl-9"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                updateParams({ q: event.currentTarget.value.trim() });
              }
            }}
            onBlur={(event) => {
              const value = event.currentTarget.value.trim();
              if (value !== search) updateParams({ q: value });
            }}
          />
        </div>
        <Select value={sort} onValueChange={(value) => updateParams({ sort: value as ParticipantSort })}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as ParticipantSort[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {participants.length === 0 ? (
        <Card className="surface-card">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UsersThree size={32} className="text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {search
                ? "Nenhum participante encontrado para esta busca."
                : "Participantes aparecem aqui após reuniões com convidados registrados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Participante</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Reuniões</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Última call</th>
                <th className="px-4 py-3 font-medium text-right">Tarefas</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr
                  key={participant.key}
                  className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/participantes/${participant.hrefKey}`}
                      className="block font-medium text-foreground hover:text-brand"
                    >
                      {participant.displayName}
                      {participant.hasNotes && (
                        <span className="ml-2 text-xs font-normal text-brand">· notas</span>
                      )}
                    </Link>
                    {participant.email && (
                      <p className="truncate text-xs text-muted-foreground">{participant.email}</p>
                    )}
                    {participant.notePreview && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground italic">
                        {participant.notePreview}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">{participant.meetingCount}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {participant.lastMeetingAt
                      ? formatMeetingDateTime(participant.lastMeetingAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {participant.openTaskCount > 0 ? (
                      <span className="font-medium text-brand">{participant.openTaskCount}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
