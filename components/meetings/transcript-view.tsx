import { ChatText } from "@phosphor-icons/react/dist/ssr";
import { formatTimestamp } from "@/lib/meetings/transcript";
import type { TranscriptSegment } from "@/lib/supabase/types";

const SPEAKER_TONES = [
  "bg-brand/12 text-brand",
  "bg-primary/10 text-primary",
  "bg-accent text-accent-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-foreground/80",
  "bg-brand/8 text-primary",
];

function toneForSpeaker(speaker: string, index: Map<string, number>): string {
  if (!index.has(speaker)) index.set(speaker, index.size);
  return SPEAKER_TONES[(index.get(speaker) ?? 0) % SPEAKER_TONES.length];
}

export function TranscriptView({ segments }: { segments: TranscriptSegment[] }) {
  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <ChatText size={28} className="text-muted-foreground/60" aria-hidden />
        <p className="text-sm text-muted-foreground">
          A transcrição aparecerá aqui assim que a reunião for processada.
        </p>
      </div>
    );
  }

  const speakerIndex = new Map<string, number>();

  return (
    <div className="space-y-4">
      {segments.map((segment) => (
        <div key={segment.id} className="flex gap-3">
          <span className="w-12 shrink-0 pt-0.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {formatTimestamp(segment.start_ms)}
          </span>
          <div className="min-w-0 flex-1">
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${toneForSpeaker(
                segment.speaker_label,
                speakerIndex
              )}`}
            >
              {segment.speaker_label}
            </span>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{segment.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
