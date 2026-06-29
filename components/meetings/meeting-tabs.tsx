"use client";

import type { ReactNode } from "react";
import { ChatCircleDots, ListChecks, Sparkle, TextAlignLeft } from "@phosphor-icons/react";
import { ActionItemsTab } from "@/components/meetings/action-items-tab";
import { MeetingChat } from "@/components/ia/meeting-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Citation } from "@/lib/meetings/chat";
import type { ActionItem } from "@/lib/supabase/types";

export type ChatUiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
};

export function MeetingTabs({
  meetingId,
  summary,
  transcript,
  actionItems,
  chatMessages,
  llmEnabled,
}: {
  meetingId: string;
  summary: ReactNode;
  transcript: ReactNode;
  actionItems: ActionItem[];
  chatMessages: ChatUiMessage[];
  llmEnabled: boolean;
}) {
  const openCount = actionItems.filter((i) => i.status === "open").length;

  return (
    <Tabs defaultValue="resumo">
      <TabsList className="flex-wrap">
        <TabsTrigger value="resumo">
          <Sparkle size={14} className="mr-1.5" />
          Resumo
        </TabsTrigger>
        <TabsTrigger value="atribuicoes">
          <ListChecks size={14} className="mr-1.5" />
          Atribuições
          {openCount > 0 && (
            <span className="ml-1.5 rounded-full bg-brand/15 px-1.5 text-xs text-brand">
              {openCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="transcricao">
          <TextAlignLeft size={14} className="mr-1.5" />
          Transcrição
        </TabsTrigger>
        <TabsTrigger value="chat">
          <ChatCircleDots size={14} className="mr-1.5" />
          Chat
        </TabsTrigger>
      </TabsList>

      <TabsContent value="resumo" className="pt-4">
        {summary}
      </TabsContent>

      <TabsContent value="atribuicoes" className="pt-4">
        <ActionItemsTab meetingId={meetingId} initialItems={actionItems} />
      </TabsContent>

      <TabsContent value="transcricao" className="pt-4">
        {transcript}
      </TabsContent>

      <TabsContent value="chat" className="pt-4">
        <MeetingChat
          meetingId={meetingId}
          initialMessages={chatMessages}
          llmEnabled={llmEnabled}
        />
      </TabsContent>
    </Tabs>
  );
}
