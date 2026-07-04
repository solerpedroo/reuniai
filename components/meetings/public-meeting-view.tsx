"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChatCircle,
  CheckCircle,
  LockKey,
  Sparkle,
  Users,
} from "@phosphor-icons/react";
import { SummaryView } from "@/components/meetings/summary-view";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/meetings/transcript";
import type { SpeakerTalkTime } from "@/lib/meetings/talk-time";
import type { SharePermissions } from "@/lib/meetings/share-permissions";
import {
  formatDuration,
  formatMeetingDateTime,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import type {
  ActionItem,
  Meeting,
  MeetingSummary,
  TranscriptSegment,
} from "@/lib/supabase/types";
import type { ShareParticipant } from "@/lib/meetings/share";
import { cn } from "@/lib/utils";
import { PRODUCT_NAME } from "@/lib/brand/config";

type Tab = "overview" | "transcript";

export function PublicMeetingView({
  meeting,
  summary,
  actionItems,
  segments,
  talkTime,
  participants,
  permissions,
  redactPii,
}: {
  meeting: Meeting;
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
  segments: TranscriptSegment[];
  talkTime: SpeakerTalkTime[];
  participants: ShareParticipant[];
  permissions: SharePermissions;
  redactPii: boolean;
}) {
  const hasTranscript = permissions.transcript && segments.length > 0;
  const showOverview =
    permissions.executive_summary ||
    permissions.topics ||
    permissions.decisions ||
    permissions.action_items ||
    permissions.talk_time;
  const [tab, setTab] = useState<Tab>(hasTranscript && !showOverview ? "transcript" : "overview");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/40">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {PRODUCT_NAME}
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold">{meeting.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMeetingDateTime(meeting.started_at)} ·{" "}
              {formatDuration(getMeetingDurationMs(meeting))}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {redactPii && (
          <p className="mb-6 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-xs text-muted-foreground">
            Dados sensíveis foram redigidos nesta visualização pública.
          </p>
        )}

        {permissions.participants && participants.length > 0 && (
          <section className="mb-6 flex flex-wrap items-center gap-2">
            <Users size={16} className="text-muted-foreground" aria-hidden />
            {participants.map((participant, i) => (
              <span
                key={i}
                className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs text-foreground"
              >
                {participant.name}
              </span>
            ))}
          </section>
        )}

        {(showOverview || hasTranscript) && (
          <nav className="mb-8 flex gap-1 border-b border-border/70">
            {showOverview && (
              <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
                Visão geral
              </TabButton>
            )}
            {hasTranscript && (
              <TabButton active={tab === "transcript"} onClick={() => setTab("transcript")}>
                Transcrição
              </TabButton>
            )}
          </nav>
        )}

        {tab === "overview" && showOverview && (
          <div className="space-y-8">
            <SummaryView
              summary={summary}
              talkTime={talkTime}
              visibility={{
                executive_summary: permissions.executive_summary,
                topics: permissions.topics,
                decisions: permissions.decisions,
                talk_time: permissions.talk_time,
              }}
            />

            {permissions.action_items && actionItems.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-brand" aria-hidden />
                  <h3 className="text-sm font-semibold tracking-tight">Atribuições</h3>
                  <span className="h-px flex-1 bg-border/80" />
                </div>
                <ul className="space-y-2">
                  {actionItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-3 rounded-lg border border-border/70 bg-muted/15 px-4 py-3 text-sm"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        {item.assignee && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Responsável: {item.assignee}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {tab === "transcript" && hasTranscript && (
          <section className="space-y-1">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="group flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
              >
                <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
                  {formatTimestamp(segment.start_ms)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-brand">{segment.speaker_label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-foreground">{segment.text}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        <aside className="mt-12 rounded-xl border border-brand/20 bg-gradient-to-br from-brand/5 via-card to-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-brand/10 p-2">
                <Sparkle size={20} className="text-brand" weight="duotone" />
              </div>
              <div>
                <p className="font-medium text-foreground">Recursos com IA</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chat sobre a reunião, follow-up automático, busca semântica e exportações
                  avançadas exigem uma conta no {PRODUCT_NAME}.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/signup">
                <ChatCircle size={16} className="mr-1.5" />
                Criar conta gratuita
              </Link>
            </Button>
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { icon: ChatCircle, label: "Perguntar à IA sobre a reunião" },
              { icon: LockKey, label: "Gravação e player sincronizado" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground"
              >
                <Icon size={14} className="shrink-0 text-brand/70" />
                {label}
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-4 py-2.5 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
      )}
    </button>
  );
}
