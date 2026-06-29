import type { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Citation = { start_ms: number; text: string };

export async function getChatMessages(
  supabase: Client,
  meetingId: string
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  return (data ?? []) as ChatMessage[];
}

/** Normaliza o campo `citations` (Json) para um array tipado. */
export function parseCitations(citations: ChatMessage["citations"]): Citation[] {
  if (!Array.isArray(citations)) return [];
  return citations
    .map((entry) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
      const c = entry as Record<string, unknown>;
      if (typeof c.start_ms !== "number" || typeof c.text !== "string") return null;
      return { start_ms: c.start_ms, text: c.text };
    })
    .filter((c): c is Citation => c !== null);
}
