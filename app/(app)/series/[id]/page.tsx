import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { StatusBadge } from "@/components/meetings/status-badge";
import { SeriesChat } from "@/components/series/series-chat";
import { SeriesTemplateSelect } from "@/components/series/series-template-select";
import { SeriesTopicDiff } from "@/components/series/series-topic-diff";
import { parseTemplateId } from "@/lib/analysis/template-types";
import { isLlmConfigured } from "@/lib/llm/client";
import { getMeetingSummary } from "@/lib/meetings/insights";
import { computeTopicDiff } from "@/lib/series/topic-diff";
import { getMeetingsInSeries } from "@/lib/series/queries";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let seriesTemplate: ReturnType<typeof parseTemplateId> | null = null;
  if (user) {
    const { data: seriesDefault } = await admin
      .from("series_analysis_defaults")
      .select("analysis_template")
      .eq("user_id", user.id)
      .eq("calendar_recurring_event_id", recurringEventId)
      .maybeSingle();
    if (seriesDefault?.analysis_template) {
      seriesTemplate = parseTemplateId(seriesDefault.analysis_template);
    }
  }

  return (
    <div>
      <Link
        href="/series"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Todas as séries
      </Link>

      <PageHeader
        title={title}
        description={`${meetings.length} ocorrências nesta série recorrente`}
        meta="Série"
      />

      {isLlmConfigured() && (
        <div className="mb-4">
          <SeriesTemplateSelect
            recurringEventId={recurringEventId}
            initialTemplate={seriesTemplate}
          />
        </div>
      )}

      <SeriesTopicDiff diffs={diffs} />

      {meetings.length >= 2 && (
        <p className="mb-4 text-sm">
          <Link
            href={`/compare?series=${encodeURIComponent(recurringEventId)}&a=${meetings[0]!.id}&b=${meetings[1]!.id}`}
            className="text-brand underline-offset-4 hover:underline"
          >
            Comparar última vs anterior
          </Link>
        </p>
      )}

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
