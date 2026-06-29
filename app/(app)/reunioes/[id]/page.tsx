import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { ActionItemsList } from "@/components/meetings/action-items-list";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { StatusBadge } from "@/components/meetings/status-badge";
import { SummaryView } from "@/components/meetings/summary-view";
import { TranscriptSyncButton } from "@/components/meetings/transcript-sync-button";
import { TranscriptView } from "@/components/meetings/transcript-view";
import { getActionItems, getMeetingSummary } from "@/lib/meetings/insights";
import { getTranscriptSegments } from "@/lib/meetings/transcript";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import { createClient } from "@/lib/supabase/server";
import type { Meeting } from "@/lib/supabase/types";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .maybeSingle<Meeting>();

  if (!meeting) notFound();

  const [segments, summary, actionItems] = await Promise.all([
    getTranscriptSegments(supabase, meeting.id),
    getMeetingSummary(supabase, meeting.id),
    getActionItems(supabase, meeting.id),
  ]);

  return (
    <div>
      <Link
        href="/reunioes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Voltar para reuniões
      </Link>

      <PageHeader
        title={meeting.title}
        meta={formatMeetingDate(meeting.started_at)}
        description={`Duração: ${formatDuration(getMeetingDurationMs(meeting))}`}
        actions={<TranscriptSyncButton meetingId={meeting.id} />}
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <StatusBadge status={meeting.status} />
        <PlatformBadge platform={meeting.platform} />
        {meeting.meeting_url && (
          <a
            href={meeting.meeting_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-brand hover:underline"
          >
            Abrir link da reunião
          </a>
        )}
      </div>

      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Resumo</h2>
          <SummaryView summary={summary} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Itens de ação</h2>
          <ActionItemsList items={actionItems} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Transcrição</h2>
          <TranscriptView segments={segments} />
        </section>
      </div>
    </div>
  );
}
