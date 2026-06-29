"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import {
  ChatCircleDots,
  ListChecks,
  Sparkle,
  TextAlignLeft,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { ActionItemsTab } from "@/components/meetings/action-items-tab";
import { MeetingChat } from "@/components/ia/meeting-chat";
import { TranscriptView } from "@/components/meetings/transcript-view";
import { easePremium } from "@/components/motion/presets";
import type { Citation } from "@/lib/meetings/chat";
import type { ActionItem, TranscriptSegment } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export type ChatUiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
};

const TABS = [
  { value: "resumo", label: "Resumo", icon: Sparkle },
  { value: "atribuicoes", label: "Atribuições", icon: ListChecks },
  { value: "transcricao", label: "Transcrição", icon: TextAlignLeft },
  { value: "chat", label: "Chat", icon: ChatCircleDots },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function MeetingTabs({
  meetingId,
  summary,
  segments,
  actionItems,
  chatMessages,
  llmEnabled,
  currentTimeMs = 0,
  highlightMs = null,
  onHighlightDone,
  onSeek,
  onCitationClick,
}: {
  meetingId: string;
  summary: ReactNode;
  segments: TranscriptSegment[];
  actionItems: ActionItem[];
  chatMessages: ChatUiMessage[];
  llmEnabled: boolean;
  currentTimeMs?: number;
  highlightMs?: number | null;
  onHighlightDone?: () => void;
  onSeek?: (ms: number) => void;
  onCitationClick?: (citation: Citation) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabValue>("resumo");
  const openCount = actionItems.filter((i) => i.status === "open").length;

  const handleCitation = useCallback(
    (citation: Citation) => {
      onCitationClick?.(citation);
      setActiveTab("transcricao");
    },
    [onCitationClick]
  );

  const panelId = (tab: TabValue) => `meeting-tab-panel-${tab}`;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Conteúdo da reunião"
        className="inline-flex flex-wrap gap-1 rounded-xl bg-muted/60 p-1"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              id={`meeting-tab-${tab.value}`}
              aria-selected={isActive}
              aria-controls={panelId(tab.value)}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="meeting-tab-indicator"
                  className="absolute inset-0 rounded-lg bg-background shadow-sm ring-1 ring-border/60"
                  transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={14} className={isActive ? "text-brand" : undefined} />
                {tab.label}
                {tab.value === "atribuicoes" && openCount > 0 && (
                  <span className="rounded-full bg-brand/15 px-1.5 text-xs text-brand">
                    {openCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            role="tabpanel"
            id={panelId(activeTab)}
            aria-labelledby={`meeting-tab-${activeTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: easePremium }}
          >
            {activeTab === "resumo" && summary}
            {activeTab === "atribuicoes" && (
              <ActionItemsTab meetingId={meetingId} initialItems={actionItems} />
            )}
            {activeTab === "transcricao" && (
              <TranscriptView
                segments={segments}
                currentTimeMs={currentTimeMs}
                highlightMs={highlightMs}
                onHighlightDone={onHighlightDone}
                onSeek={onSeek}
              />
            )}
            {activeTab === "chat" && (
              <MeetingChat
                meetingId={meetingId}
                initialMessages={chatMessages}
                llmEnabled={llmEnabled}
                onCitationClick={handleCitation}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
