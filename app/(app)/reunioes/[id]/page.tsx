import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { MeetingStatusBanner } from "@/components/meetings/meeting-status-banner";
import { MeetingTabs } from "@/components/meetings/meeting-tabs";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { StatusBadge } from "@/components/meetings/status-badge";
import { SummaryView } from "@/components/meetings/summary-view";
import { TranscriptSyncButton } from "@/components/meetings/transcript-sync-button";
import { TranscriptView } from "@/components/meetings/transcript-view";
import { getChatMessages, parseCitations } from "@/lib/meetings/chat";
import { getActionItems, getMeetingSummary } from "@/lib/meetings/insights";
import { getTranscriptSegments } from "@/lib/meetings/transcript";
import { isLlmConfigured } from "@/lib/llm/client";
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

  const [segments, summary, actionItems, chatMessages] = await Promise.all([
    getTranscriptSegments(supabase, meeting.id),
    getMeetingSummary(supabase, meeting.id),
    getActionItems(supabase, meeting.id),
    getChatMessages(supabase, meeting.id),
  ]);

  const chatUiMessages = chatMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    citations: parseCitations(m.citations),
  }));

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

      <div className="mb-6 flex flex-wrap items-center gap-3">
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

      <MeetingStatusBanner meeting={meeting} />

      <MeetingTabs
        meetingId={meeting.id}
        summary={<SummaryView summary={summary} />}
        transcript={<TranscriptView segments={segments} />}
        actionItems={actionItems}
        chatMessages={chatUiMessages}
        llmEnabled={isLlmConfigured()}
      />
    </div>
  );
}
