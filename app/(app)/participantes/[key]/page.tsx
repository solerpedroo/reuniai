import { notFound } from "next/navigation";
import { ParticipantDetailView } from "@/components/participants/participant-detail-view";
import { getParticipantDetail } from "@/lib/participants/directory";
import { createClient } from "@/lib/supabase/server";

type ParticipantDetailPageProps = {
  params: Promise<{ key: string }>;
};

export default async function ParticipantDetailPage({ params }: ParticipantDetailPageProps) {
  const { key } = await params;
  const supabase = await createClient();
  const participant = await getParticipantDetail(supabase, key);

  if (!participant) notFound();

  return <ParticipantDetailView participant={participant} />;
}
