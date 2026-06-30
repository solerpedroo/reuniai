import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMeetingView } from "@/components/meetings/public-meeting-view";
import { PRODUCT_NAME } from "@/lib/brand/config";
import { resolveShareToken } from "@/lib/meetings/share";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const admin = createAdminClient();
  const share = await resolveShareToken(admin, token);

  if (!share) {
    return { title: "Link indisponível" };
  }

  const description =
    share.summary?.executive_summary?.slice(0, 160) ??
    `Reunião compartilhada via ${PRODUCT_NAME}`;

  return {
    title: share.meeting.title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: share.meeting.title,
      description,
      type: "article",
    },
  };
}

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const share = await resolveShareToken(admin, token);

  if (!share) notFound();

  const { meeting, summary, actionItems, segments, participants, token: shareToken } = share;

  return (
    <PublicMeetingView
      meeting={meeting}
      summary={summary}
      actionItems={actionItems}
      segments={segments}
      participants={participants}
      scope={shareToken.scope}
      redactPii={shareToken.redact_pii !== false}
    />
  );
}
