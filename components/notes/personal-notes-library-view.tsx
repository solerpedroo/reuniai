"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NotePencil } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PersonalNoteLibraryEntry } from "@/lib/meetings/personal-notes-library-types";
import { formatMeetingDateTime } from "@/lib/meetings/types";

export function PersonalNotesLibraryView({
  entries,
  total,
}: {
  entries: PersonalNoteLibraryEntry[];
  total: number;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.preview.toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q)
    );
  }, [entries, query]);

  if (entries.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
        <NotePencil size={32} className="text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Escreva notas pessoais na aba &quot;Minhas notas&quot; de uma reunião — elas aparecerão
          aqui.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/reunioes">Ver reuniões</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {total} nota{total === 1 ? "" : "s"} pessoais
        </p>
        <Input
          type="search"
          placeholder="Buscar nas notas…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
      </div>

      <ul className="space-y-3">
        {filtered.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/reunioes/${entry.id}?tab=minhas-notas`}
              className="surface-card block p-4 transition-colors hover:border-brand/30"
            >
              <span className="block font-medium">{entry.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground line-clamp-2">
                {entry.preview}
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">
                Reunião {formatMeetingDateTime(entry.started_at)} · atualizada{" "}
                {formatMeetingDateTime(entry.updated_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
