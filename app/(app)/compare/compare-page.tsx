"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowsLeftRight } from "@phosphor-icons/react";
import { ComparePicker } from "@/components/compare/compare-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComparePickerMeeting } from "@/lib/meetings/compare-picker-types";
import { formatMeetingDate } from "@/lib/meetings/types";

type CompareResponse = {
  meetingA: { id: string; title: string; started_at: string };
  meetingB: { id: string; title: string; started_at: string };
  topicDiff: { added: string[]; removed: string[] };
  actionItemDiff: { resolved: string[]; newItems: string[]; unchanged: string[] };
  narrative: string | null;
};

export default function ComparePage({
  meetings,
  seriesId,
  initialA,
  initialB,
}: {
  meetings: ComparePickerMeeting[];
  seriesId?: string;
  initialA?: string;
  initialB?: string;
}) {
  const a = initialA;
  const b = initialB;
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!a || !b) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    void fetch(`/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`)
      .then(async (res) => {
        const json = (await res.json()) as CompareResponse & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Falha ao comparar");
        setData(json);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro"))
      .finally(() => setLoading(false));
  }, [a, b]);

  return (
    <div>
      <Link
        href={seriesId ? `/series/${encodeURIComponent(seriesId)}` : "/reunioes"}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        {seriesId ? "Voltar à série" : "Voltar para reuniões"}
      </Link>

      <PageHeader
        title="Comparar reuniões"
        description="Veja o que mudou entre duas ocorrências — tópicos, atribuições e narrativa."
        meta="Diff"
      />

      <ComparePicker
        meetings={meetings}
        meetingAId={a}
        meetingBId={b}
        seriesId={seriesId}
      />

      {!a || !b ? null : loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Comparando reuniões…</p>
      ) : error ? (
        <Card className="mt-6">
          <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : data ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{data.meetingA.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatMeetingDate(data.meetingA.started_at)}
                <div className="mt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/reunioes/${data.meetingA.id}`}>Abrir reunião</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{data.meetingB.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatMeetingDate(data.meetingB.started_at)}
                <div className="mt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/reunioes/${data.meetingB.id}`}>Abrir reunião</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {data.narrative && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowsLeftRight size={18} />
                  O que mudou
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed">{data.narrative}</CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <DiffList title="Tópicos adicionados" items={data.topicDiff.added} empty="Nenhum" />
            <DiffList title="Tópicos removidos" items={data.topicDiff.removed} empty="Nenhum" />
            <DiffList title="Action items resolvidos" items={data.actionItemDiff.resolved} empty="Nenhum" />
            <DiffList title="Novos action items" items={data.actionItemDiff.newItems} empty="Nenhum" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DiffList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-sm">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
