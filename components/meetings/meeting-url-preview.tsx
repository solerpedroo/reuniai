"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Info, Warning, WarningCircle } from "@phosphor-icons/react";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { easePremium } from "@/components/motion/presets";
import type { MeetingUrlPreview } from "@/lib/meetings/normalize-meeting-url";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  idle: "border-border/80 bg-muted/30 text-muted-foreground",
  valid: "border-brand/30 bg-brand/5 text-foreground",
  warning: "border-amber-500/30 bg-amber-500/8 text-amber-800 dark:text-amber-300",
  error: "border-destructive/30 bg-destructive/5 text-destructive",
} as const;

const TONE_ICONS = {
  idle: Info,
  valid: CheckCircle,
  warning: Warning,
  error: WarningCircle,
} as const;

export function MeetingUrlPreviewCard({ preview }: { preview: MeetingUrlPreview }) {
  const Icon = TONE_ICONS[preview.tone];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${preview.tone}-${preview.message}`}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.28, ease: easePremium }}
        className={cn(
          "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm",
          TONE_STYLES[preview.tone]
        )}
      >
        <Icon
          size={18}
          weight={preview.tone === "valid" ? "fill" : "regular"}
          className={cn(
            "mt-0.5 shrink-0",
            preview.tone === "valid" && "text-brand",
            preview.tone === "warning" && "text-amber-500",
            preview.tone === "error" && "text-destructive"
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="leading-relaxed">{preview.message}</p>
          {preview.platform && preview.tone !== "idle" && (
            <PlatformBadge platform={preview.platform} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
