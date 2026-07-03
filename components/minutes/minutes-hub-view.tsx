"use client";

import Link from "next/link";
import { FileText } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MinutesHubItem = {
  id: string;
  meeting_id: string;
  content_md: string;
  generated_at: string;
  meeting_title?: string;
};

export function MinutesHubView({ items }: { items: MinutesHubItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma ata gerada ainda. Abra uma reunião concluída e clique em &quot;Gerar ata&quot;.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" />
              {item.meeting_title ?? "Reunião"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/reunioes/${item.meeting_id}`}>Abrir reunião</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`/api/meetings/${item.meeting_id}/minutes?format=pdf`} download>
                PDF
              </a>
            </Button>
            <span className="text-xs text-muted-foreground">
              {new Date(item.generated_at).toLocaleString("pt-BR")}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
