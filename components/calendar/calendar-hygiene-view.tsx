"use client";

import { useEffect, useState } from "react";
import { CalendarX, WarningCircle } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalendarHygieneReport } from "@/lib/calendar/hygiene";

export function CalendarHygieneView() {
  const [report, setReport] = useState<CalendarHygieneReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar/hygiene")
      .then(async (res) => {
        const data = (await res.json()) as { report?: CalendarHygieneReport; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Falha ao carregar.");
        setReport(data.report ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Analisando calendário…</p>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-destructive">
          <WarningCircle className="size-4" />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Horas (7 dias)" value={`${report.weekHours}h`} />
        <Metric label="Eventos" value={String(report.meetingCount)} />
        <Metric label="Recorrentes" value={String(report.recurringCount)} />
        <Metric label="Score de carga" value={`${report.loadScore}/100`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarX className="size-4" />
            Sugestões de higiene
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Calendário equilibrado nesta semana.</p>
          ) : (
            report.suggestions.map((item, index) => (
              <div key={index} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
