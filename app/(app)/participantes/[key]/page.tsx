import { notFound } from "next/navigation";
import { ParticipantDetailView } from "@/components/participants/participant-detail-view";
import { getParticipantTalkTimeSummary } from "@/lib/insights/talk-time-stats";
import { getParticipantDetail } from "@/lib/participants/directory";
import { getParticipantNote, parseParticipantKeyParam } from "@/lib/participants/notes";
import { createClient } from "@/lib/supabase/server";

type ParticipantDetailPageProps = {
  params: Promise<{ key: string }>;
};

export default async function ParticipantDetailPage({ params }: ParticipantDetailPageProps) {
  const { key } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const participant = await getParticipantDetail(supabase, key);

  if (!participant) notFound();

  const note =
    user != null
      ? await getParticipantNote(supabase, user.id, parseParticipantKeyParam(key))
      : null;

  const talkTimeSummary = await getParticipantTalkTimeSummary(
    supabase,
    participant.displayName
  );

  return (
    <ParticipantDetailView
      participant={participant}
      initialNoteBody={note?.body ?? ""}
      talkTimeSummary={talkTimeSummary}
    />
  );
}
