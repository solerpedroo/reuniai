import { GoogleLogo, MicrosoftTeamsLogo, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { MeetingPlatform } from "@/lib/supabase/types";
import { PLATFORM_LABELS } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

const PLATFORM_ICONS: Record<MeetingPlatform, Icon> = {
  google_meet: VideoCamera,
  zoom: VideoCamera,
  teams: MicrosoftTeamsLogo,
  other: VideoCamera,
};

export function PlatformBadge({
  platform,
  className,
}: {
  platform: MeetingPlatform;
  className?: string;
}) {
  const Logo = platform === "google_meet" ? GoogleLogo : PLATFORM_ICONS[platform];

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      <Logo size={15} className="shrink-0" aria-hidden />
      {PLATFORM_LABELS[platform]}
    </span>
  );
}
