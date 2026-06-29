import Link from "next/link";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMeetingDate } from "@/lib/meetings/types";
import type { MeetingSeries } from "@/lib/workflow/types";

export function SeriesListCard({ series }: { series: MeetingSeries[] }) {
  if (series.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowsClockwise size={18} className="text-brand" />
          Séries recorrentes
        </CardTitle>
        <CardDescription>Reuniões agrupadas pelo calendário</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {series.slice(0, 5).map((item) => (
          <Link
            key={item.recurringEventId}
            href={`/series/${encodeURIComponent(item.recurringEventId)}`}
            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:border-brand/40 hover:bg-brand/5"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.meetingCount} reuniões · última {formatMeetingDate(item.lastStartedAt)}
              </p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
