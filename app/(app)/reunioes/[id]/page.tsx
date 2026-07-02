import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { BotActions } from "@/components/meetings/bot-actions";
import { DeleteMeetingButton } from "@/components/meetings/delete-meeting-button";
import { AnalysisTemplateSelect } from "@/components/meetings/analysis-template-select";
import { ExportMeetingButton } from "@/components/meetings/export-meeting-button";
import { PrepCard } from "@/components/dashboard/prep-card";
import { MeetingReview } from "@/components/meetings/meeting-review";
import { MeetingReviewWizard } from "@/components/meetings/meeting-review-wizard";
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
import { getMeetingHighlights } from "@/lib/meetings/highlights";
import { getFollowUpForMeeting } from "@/lib/meetings/follow-up";
import { getPrepCardForMeeting } from "@/lib/meetings/prep";
import { getSpeakerMappings } from "@/lib/speakers/mappings";
import { parseTemplateId } from "@/lib/analysis/template-types";
import { ReviewQueueBanner } from "@/components/review/review-queue-banner";
import { needsPostCallReview } from "@/lib/meetings/post-call-review";
import { getReviewQueueCounts } from "@/lib/review/review-queue";
import { getTagsForMeeting } from "@/lib/tags/queries";
import type { Meeting } from "@/lib/supabase/types";

export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; revisar?: string; prep?: string }>;
}) {
  const { id } = await params;
  const { t, revisar, prep } = await searchParams;
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .maybeSingle<Meeting>();

  if (!meeting) notFound();

  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [segments, summary, actionItems, chatMessages, tags, followUp, comments, highlights, speakerMappings, prepCard, reviewCounts] =
    await Promise.all([
      getTranscriptSegments(supabase, meeting.id),
      getMeetingSummary(supabase, meeting.id),
      getActionItems(supabase, meeting.id),
      getChatMessages(supabase, meeting.id),
      getTagsForMeeting(supabase, meeting.id),
      getFollowUpForMeeting(admin, meeting.id),
      getMeetingComments(supabase, meeting.id),
      getMeetingHighlights(supabase, meeting.id),
      user ? getSpeakerMappings(admin, user.id) : Promise.resolve([]),
      prep === "1" && user
        ? getPrepCardForMeeting(admin, user.id, meeting.id)
        : Promise.resolve(null),
      getReviewQueueCounts(supabase),
    ]);

  const { data: participantRows } = await supabase
    .from("participants")
    .select("email")
    .eq("meeting_id", meeting.id)
    .not("email", "is", null)
    .returns<{ email: string | null }[]>();

  const participantEmails = Array.from(
    new Set(
      ((participantRows ?? []) as { email: string | null }[])
        .map((p) => p.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email))
    )
  );

  const meetingWithTemplate = meeting as Meeting & { analysis_template?: string | null };
  const analysisTemplate = meetingWithTemplate.analysis_template
    ? parseTemplateId(meetingWithTemplate.analysis_template)
    : null;

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
        {isLlmConfigured() && (
          <AnalysisTemplateSelect meetingId={meeting.id} initialTemplate={analysisTemplate} />
        )}
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

      {prepCard && (
        <div className="mb-6">
          <PrepCard prep={prepCard} meeting={prepCard.meeting} />
        </div>
      )}

      {revisar === "1" && needsPostCallReview(meeting) && (
        <ReviewQueueBanner pendingCount={reviewCounts.pending} />
      )}

      <MeetingReviewWizard
        meeting={meeting}
        summary={summary}
        actionItems={actionItems}
        followUp={followUp}
        llmEnabled={isLlmConfigured()}
        forceOpen={revisar === "1"}
        participantEmails={participantEmails}
      />

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
        highlights={highlights}
        speakerMappings={speakerMappings}
        participantEmails={participantEmails}
        personalNotes={meeting.personal_notes ?? ""}
      />
    </div>
  );
}
