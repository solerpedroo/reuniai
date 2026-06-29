import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import { resolveShareToken } from "@/lib/meetings/share";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const share = await resolveShareToken(admin, token);

  if (!share) notFound();

  const { meeting, summary, actionItems, segments } = share;
  const topics = parseTopics(summary?.topics ?? []);
  const decisions = parseDecisions(summary?.decisions ?? []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">ReuniAI</p>
        <h1 className="mt-1 text-2xl font-semibold">{meeting.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatMeetingDate(meeting.started_at)} · {formatDuration(getMeetingDurationMs(meeting))}
        </p>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        {share.token.redact_pii !== false && (
          <p className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-xs text-muted-foreground">
            Dados sensíveis foram redigidos nesta visualização pública.
          </p>
        )}
        {summary?.executive_summary && (
          <section>
            <h2 className="text-lg font-medium">Resumo</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {summary.executive_summary}
            </p>
          </section>
        )}

        {topics.length > 0 && (
          <section>
            <h2 className="text-lg font-medium">Tópicos</h2>
            <ul className="mt-3 space-y-3">
              {topics.map((topic) => (
                <li key={topic.title} className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium">{topic.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{topic.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {decisions.length > 0 && (
          <section>
            <h2 className="text-lg font-medium">Decisões</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {decisions.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>
          </section>
        )}

        {actionItems.length > 0 && (
          <section>
            <h2 className="text-lg font-medium">Atribuições</h2>
            <ul className="mt-2 space-y-2">
              {actionItems.map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="font-medium">{item.title}</span>
                  {item.assignee && (
                    <span className="text-muted-foreground"> — {item.assignee}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {segments.length > 0 && (
          <section>
            <h2 className="text-lg font-medium">Transcrição</h2>
            <div className="mt-3 space-y-3 text-sm">
              {segments.map((segment) => (
                <p key={segment.id}>
                  <span className="font-medium text-muted-foreground">
                    {segment.speaker_label}:
                  </span>{" "}
                  {segment.text}
                </p>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
