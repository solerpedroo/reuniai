import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicClipView } from "@/components/clips/public-clip-view";
import { PRODUCT_NAME } from "@/lib/brand/config";
import { resolveMeetingClip } from "@/lib/clips/clips";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const admin = createAdminClient();
  const clip = await resolveMeetingClip(admin, token);

  if (!clip) {
    return { title: "Clip indisponível" };
  }

  return {
    title: `${clip.meeting.title} — clip`,
    description: clip.caption.slice(0, 160),
    robots: { index: false, follow: false },
  };
}

export default async function PublicClipPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const clip = await resolveMeetingClip(admin, token);

  if (!clip) notFound();

  return (
    <PublicClipView
      meetingTitle={clip.meeting.title}
      caption={clip.caption}
      startMs={clip.clip.start_ms}
      segments={clip.segments}
      productName={PRODUCT_NAME}
    />
  );
}
