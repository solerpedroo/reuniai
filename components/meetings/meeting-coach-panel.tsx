"use client";

import { ChartLineUp, Lightbulb } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoachReport } from "@/lib/coach/analyze-meeting-coach";
import { cn } from "@/lib/utils";

const METRIC_LABELS: Record<string, string> = {
  clarity: "Clareza",
  engagement: "Engajamento",
  decisions: "Decisões",
  follow_through: "Follow-through",
  balance: "Equilíbrio",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-destructive",
  medium: "border-l-amber-500",
  low: "border-l-muted-foreground",
};

export function MeetingCoachPanel({ report }: { report: CoachReport | null }) {
  if (!report) return null;

  const metrics = Object.entries(report.metrics).filter(([, v]) => typeof v === "number");

  return (
    <Card className="surface-card mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ChartLineUp size={18} className="text-brand" aria-hidden />
          Coach de reunião
          <span
            className={cn(
              "ml-auto rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums",
              report.score >= 75 && "bg-emerald-500/10 text-emerald-700",
              report.score >= 50 && report.score < 75 && "bg-amber-500/10 text-amber-700",
              report.score < 50 && "bg-destructive/10 text-destructive"
            )}
          >
            {report.score}/100
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            {metrics.map(([key, value]) => (
              <div key={key} className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">{METRIC_LABELS[key] ?? key}</p>
                <p className="text-lg font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        )}

        {report.suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Lightbulb size={16} className="text-brand" aria-hidden />
              Sugestões
            </p>
            <ul className="space-y-2">
              {report.suggestions.map((s, i) => (
                <li
                  key={i}
                  className={cn("border-l-2 pl-3 text-sm", PRIORITY_STYLES[s.priority] ?? "border-l-muted")}
                >
                  <p className="font-medium">{s.title}</p>
                  <p className="text-muted-foreground">{s.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
