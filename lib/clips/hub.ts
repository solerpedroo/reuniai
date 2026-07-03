import "server-only";

import type { MeetingClipRow } from "@/lib/clips/clips";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ClipsHubItem = MeetingClipRow & {
  meetingTitle: string;
  shareUrl: string;
  isActive: boolean;
};

export type ClipsHub = {
  items: ClipsHubItem[];
  activeCount: number;
};

export async function getClipsHub(
  supabase: Client,
  options: { includeInactive?: boolean } = {}
): Promise<ClipsHub> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { items: [], activeCount: 0 };
  }

  const { data: rows, error } = await supabase
    .from("meeting_clips")
    .select("*, meetings(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const now = Date.now();

  const items: ClipsHubItem[] = (rows ?? []).map((row) => {
    const clip = row as MeetingClipRow & { meetings: { title: string } | null };
    const isActive = !clip.revoked_at && Date.parse(clip.expires_at) > now;
    return {
      ...clip,
      meetingTitle: clip.meetings?.title ?? "Reunião",
      shareUrl: `${appUrl}/c/${clip.token}`,
      isActive,
    };
  });

  const filtered = options.includeInactive ? items : items.filter((item) => item.isActive);

  return {
    items: filtered,
    activeCount: items.filter((item) => item.isActive).length,
  };
}
