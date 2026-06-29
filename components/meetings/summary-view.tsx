import { Gavel, Quotes, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { TalkTimeChart } from "@/components/meetings/talk-time-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import type { SpeakerTalkTime } from "@/lib/meetings/talk-time";
import type { MeetingSummary } from "@/lib/supabase/types";

export function SummaryView({
  summary,
  talkTime = [],
}: {
  summary: MeetingSummary | null;
  talkTime?: SpeakerTalkTime[];
}) {
  if (!summary) {
    return (
      <EmptyState
        icon={Sparkle}
        tone="brand"
        title="Resumo em processamento"
        description="Assim que a IA terminar de analisar a reunião, o resumo executivo, tópicos e decisões aparecerão aqui."
      />
    );
  }

  const topics = parseTopics(summary.topics);
  const decisions = parseDecisions(summary.decisions);

  return (
    <article className="space-y-8">
      {summary.executive_summary && (
        <section className="relative overflow-hidden rounded-xl border border-brand/15 bg-gradient-to-br from-brand/6 via-card to-card p-6 sm:p-8">
          <Quotes
            size={48}
            weight="duotone"
            className="pointer-events-none absolute -right-2 -top-2 text-brand/10"
            aria-hidden
          />
          <p className="label-caps mb-4 text-brand/80">Resumo executivo</p>
          <blockquote className="max-w-prose border-l-2 border-brand/40 pl-4 text-[15px] leading-7 text-foreground sm:text-base sm:leading-8">
            {summary.executive_summary}
          </blockquote>
        </section>
      )}

      {talkTime.length > 1 && <TalkTimeChart data={talkTime} />}

      {topics.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Tópicos discutidos</h3>
            <span className="h-px flex-1 bg-border/80" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {topics.map((topic, i) => (
              <div
                key={i}
                className="surface-card rounded-lg p-4 transition-colors hover:border-brand/20"
              >
                <p className="text-sm font-medium text-foreground">{topic.title}</p>
                {topic.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {topic.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {decisions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Gavel size={16} className="text-brand" aria-hidden />
            <h3 className="text-sm font-semibold tracking-tight">Decisões</h3>
            <span className="h-px flex-1 bg-border/80" />
          </div>
          <ul className="space-y-3">
            {decisions.map((decision, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-border/70 bg-muted/15 px-4 py-3 text-sm leading-relaxed text-foreground"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {decision}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
