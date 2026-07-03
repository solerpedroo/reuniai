"use client";

import { formatTimestamp } from "@/lib/meetings/transcript";
import type { TranscriptSegment } from "@/lib/supabase/types";

export function PublicClipView({
  meetingTitle,
  caption,
  startMs,
  segments,
  productName,
}: {
  meetingTitle: string;
  caption: string;
  startMs: number;
  segments: TranscriptSegment[];
  productName: string;
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{productName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{meetingTitle}</h1>
          <p className="text-sm text-muted-foreground">
            Momento em {formatTimestamp(startMs)}
          </p>
        </header>

        <div className="rounded-lg border border-border/70 bg-card p-4">
          <p className="text-sm font-medium">{caption}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Trecho da transcrição</h2>
          {segments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Transcrição indisponível neste trecho.</p>
          ) : (
            <ul className="space-y-2">
              {segments.map((segment) => (
                <li
                  key={segment.id}
                  className={
                    segment.start_ms === startMs ||
                    (segment.start_ms <= startMs &&
                      (segment.end_ms ?? segment.start_ms) >= startMs)
                      ? "rounded-md border border-brand/40 bg-brand/5 p-3"
                      : "rounded-md border border-border/60 p-3"
                  }
                >
                  <p className="text-xs font-mono text-muted-foreground">
                    {formatTimestamp(segment.start_ms)} · {segment.speaker_label}
                  </p>
                  <p className="mt-1 text-sm">{segment.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
