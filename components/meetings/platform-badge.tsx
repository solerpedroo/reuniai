import { GoogleLogo, MicrosoftTeamsLogo, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { MeetingPlatform } from "@/lib/supabase/types";
import { PLATFORM_LABELS, PLATFORM_TONES } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

const PLATFORM_ICONS: Record<MeetingPlatform, Icon> = {
  google_meet: GoogleLogo,
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
  const Logo = PLATFORM_ICONS[platform];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        PLATFORM_TONES[platform],
        className
      )}
    >
      <Logo size={13} className="shrink-0" aria-hidden />
      {PLATFORM_LABELS[platform]}
    </span>
  );
}
