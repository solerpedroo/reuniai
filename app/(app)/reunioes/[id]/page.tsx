import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { BotActions } from "@/components/meetings/bot-actions";
import { DeleteMeetingButton } from "@/components/meetings/delete-meeting-button";
import { ExportMeetingButton } from "@/components/meetings/export-meeting-button";
import { MeetingReview } from "@/components/meetings/meeting-review";
import { MeetingTagsEditor } from "@/components/meetings/meeting-tags-editor";
import { ShareLinkDialog } from "@/components/meetings/share-link-dialog";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { StatusBadge } from "@/components/meetings/status-badge";
import { TranscriptSyncButton } from "@/components/meetings/transcript-sync-button";
import { getChatMessages, parseCitations } from "@/lib/meetings/chat";
import { getActionItems, getMeetingSummary } from "@/lib/meetings/insights";
import { meetingHasRecording } from "@/lib/meetings/recording";
import { getTranscriptSegments } from "@/lib/meetings/transcript";
import { isLlmConfigured } from "@/lib/llm/client";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMeetingComments } from "@/lib/meetings/comments";
import { getFollowUpForMeeting } from "@/lib/meetings/follow-up";
import { getTagsForMeeting } from "@/lib/tags/queries";
import type { Meeting } from "@/lib/supabase/types";

export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .maybeSingle<Meeting>();

  if (!meeting) notFound();

  const [segments, summary, actionItems, chatMessages, tags, followUp, comments] = await Promise.all([
    getTranscriptSegments(supabase, meeting.id),
    getMeetingSummary(supabase, meeting.id),
    getActionItems(supabase, meeting.id),
    getChatMessages(supabase, meeting.id),
    getTagsForMeeting(supabase, meeting.id),
    getFollowUpForMeeting(createAdminClient(), meeting.id),
    getMeetingComments(supabase, meeting.id),
  ]);

  const chatUiMessages = chatMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    citations: parseCitations(m.citations),
  }));

  const initialSeekMs = t ? Number.parseInt(t, 10) : undefined;

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
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BotActions meetingId={meeting.id} status={meeting.status} />
            <ShareLinkDialog meetingId={meeting.id} />
            <ExportMeetingButton meetingId={meeting.id} />
            <DeleteMeetingButton meetingId={meeting.id} meetingTitle={meeting.title} />
            <TranscriptSyncButton meetingId={meeting.id} />
          </div>
        }
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

      <div className="mb-6">
        <MeetingTagsEditor meetingId={meeting.id} initialTags={tags} />
      </div>

      <MeetingReview
        meeting={meeting}
        hasRecording={meetingHasRecording(meeting)}
        segments={segments}
        summary={summary}
        actionItems={actionItems}
        chatMessages={chatUiMessages}
        llmEnabled={isLlmConfigured()}
        initialSeekMs={Number.isFinite(initialSeekMs) ? initialSeekMs : undefined}
        followUp={followUp}
        comments={comments}
      />
    </div>
  );
}
