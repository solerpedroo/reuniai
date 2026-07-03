"use client";

import Link from "next/link";
import { BookOpen, CalendarBlank } from "@phosphor-icons/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Entry = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  tags: string[];
  source_meeting_ids: string[];
  updated_at: string;
};

export function KnowledgeHubView({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma entrada ainda. Processe reuniões para alimentar a base automaticamente.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-base">
                <BookOpen className="mt-0.5 size-4 shrink-0" weight="duotone" />
                <Link href={`/conhecimento/${entry.slug}`} className="hover:underline">
                  {entry.title}
                </Link>
              </CardTitle>
              {entry.summary && (
                <CardDescription className="line-clamp-3">{entry.summary}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <CalendarBlank className="size-3.5" />
                Atualizado {new Date(entry.updated_at).toLocaleDateString("pt-BR")}
                {entry.source_meeting_ids.length > 0 &&
                  ` · ${entry.source_meeting_ids.length} reunião(ões)`}
              </p>
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.slice(0, 5).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
