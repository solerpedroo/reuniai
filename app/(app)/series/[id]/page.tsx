import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { StatusBadge } from "@/components/meetings/status-badge";
import { SeriesChat } from "@/components/series/series-chat";
import { SeriesTopicDiff } from "@/components/series/series-topic-diff";
import { getMeetingSummary } from "@/lib/meetings/insights";
import { computeTopicDiff } from "@/lib/series/topic-diff";
import { getMeetingsInSeries } from "@/lib/series/queries";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import { createClient } from "@/lib/supabase/server";

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recurringEventId = decodeURIComponent(id);
  const supabase = await createClient();
  const meetings = await getMeetingsInSeries(supabase, recurringEventId);

  if (meetings.length === 0) notFound();

  const title = meetings[0]?.title ?? "Série de reuniões";

  const summaries = await Promise.all(
    meetings.slice(0, 4).map(async (meeting) => ({
      meetingId: meeting.id,
      startedAt: meeting.started_at,
      summary: await getMeetingSummary(supabase, meeting.id),
    }))
  );

  const diffs = [];
  for (let i = 0; i < summaries.length - 1; i++) {
    const current = summaries[i]!;
    const previous = summaries[i + 1]!;
    if (current.summary && previous.summary) {
      diffs.push(computeTopicDiff(previous, current));
    }
  }

  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar ao dashboard
      </Link>

      <PageHeader
        title={title}
        description={`${meetings.length} ocorrências nesta série recorrente`}
        meta="Série"
      />

      <SeriesTopicDiff diffs={diffs} />

      <div className="surface-card mb-6 divide-y divide-border/60 overflow-hidden">
        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={`/reunioes/${meeting.id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-brand/5"
          >
            <div>
              <p className="font-medium">{formatMeetingDate(meeting.started_at)}</p>
              <p className="text-sm text-muted-foreground">
                {formatDuration(getMeetingDurationMs(meeting))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={meeting.status} />
              <PlatformBadge platform={meeting.platform} />
            </div>
          </Link>
        ))}
      </div>

      <SeriesChat recurringEventId={recurringEventId} />
    </div>
  );
}
