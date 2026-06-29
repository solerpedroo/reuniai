import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import type { MeetingSummary } from "@/lib/supabase/types";

export function SummaryView({ summary }: { summary: MeetingSummary | null }) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <Sparkle size={28} className="text-muted-foreground/60" aria-hidden />
        <p className="text-sm text-muted-foreground">
          O resumo por IA aparecerá aqui após o processamento da reunião.
        </p>
      </div>
    );
  }

  const topics = parseTopics(summary.topics);
  const decisions = parseDecisions(summary.decisions);

  return (
    <div className="space-y-6">
      {summary.executive_summary && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="label-caps mb-2 text-muted-foreground">Resumo executivo</p>
          <p className="text-sm leading-relaxed text-foreground">{summary.executive_summary}</p>
        </div>
      )}

      {topics.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight">Tópicos discutidos</h3>
          <div className="space-y-2">
            {topics.map((topic, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium">{topic.title}</p>
                {topic.summary && (
                  <p className="mt-1 text-sm text-muted-foreground">{topic.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight">Decisões</h3>
          <ul className="space-y-2">
            {decisions.map((decision, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                {decision}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
