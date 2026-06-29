import Link from "next/link";
import { CalendarBlank, Clock } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMeetingDate } from "@/lib/meetings/types";
import type { MeetingPrepCard } from "@/lib/workflow/types";
import type { Meeting } from "@/lib/supabase/types";

export function PrepCard({
  prep,
  meeting,
}: {
  prep: MeetingPrepCard;
  meeting: Pick<Meeting, "id" | "title" | "started_at" | "calendar_recurring_event_id">;
}) {
  const startsIn = Math.max(
    0,
    Math.round((new Date(meeting.started_at).getTime() - Date.now()) / 60_000)
  );

  const seriesHref = meeting.calendar_recurring_event_id
    ? `/series/${encodeURIComponent(meeting.calendar_recurring_event_id)}`
    : prep.related_meeting_id
      ? `/reunioes/${prep.related_meeting_id}`
      : null;

  return (
    <Card className="border-brand/30 bg-gradient-to-br from-brand/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Próxima: {meeting.title}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <CalendarBlank size={14} />
                Preparação
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={14} />
                {startsIn <= 0 ? "Começando agora" : `Em ${startsIn} min · ${formatMeetingDate(meeting.started_at)}`}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground/90">{prep.briefing}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link href={`/reunioes/${meeting.id}`}>Ver reunião</Link>
          </Button>
          {seriesHref && (
            <Button size="sm" variant="outline" asChild>
              <Link href={seriesHref}>
                {meeting.calendar_recurring_event_id ? "Histórico da série" : "Última call similar"}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
