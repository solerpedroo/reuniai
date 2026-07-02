export type AssistantScopeType = "all" | "recent" | "series" | "participant";

export type AssistantScope = {
  type: AssistantScopeType;
  seriesId?: string;
  participantKey?: string;
  days?: number;
};

export type GlobalCitation = {
  meeting_id: string;
  meeting_title: string;
  start_ms: number;
  text: string;
};

export type AssistantChatResponse = {
  content: string;
  citations: GlobalCitation[];
};
