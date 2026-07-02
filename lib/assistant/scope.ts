import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { decodeParticipantKey } from "@/lib/participants/normalize";
import type { AssistantScope } from "@/lib/assistant/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function resolveScopedMeetingIds(
  supabase: Client,
  scope: AssistantScope
): Promise<Set<string> | null> {
  if (scope.type === "all") return null;

  const now = new Date();

  if (scope.type === "recent") {
    const days = scope.days ?? 30;
    const since = new Date(now);
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from("meetings")
      .select("id")
      .eq("status", "completed")
      .gte("started_at", since.toISOString());

    if (error) throw error;
    return new Set((data ?? []).map((row) => (row as { id: string }).id));
  }

  if (scope.type === "series" && scope.seriesId) {
    const recurringId = decodeURIComponent(scope.seriesId);
    const { data, error } = await supabase
      .from("meetings")
      .select("id")
      .eq("calendar_recurring_event_id", recurringId);

    if (error) throw error;
    return new Set((data ?? []).map((row) => (row as { id: string }).id));
  }

  if (scope.type === "participant" && scope.participantKey) {
    const key = decodeParticipantKey(scope.participantKey);
    const email = key.startsWith("email:") ? key.slice(6) : null;
    const nameSlug = key.startsWith("name:") ? key.slice(5).replace(/-/g, " ") : null;

    const { data, error } = await supabase.from("participants").select("meeting_id, name, email");

    if (error) throw error;

    const ids = new Set<string>();
    for (const row of data ?? []) {
      const participant = row as { meeting_id: string; name: string; email: string | null };
      if (email && participant.email?.toLowerCase() === email) {
        ids.add(participant.meeting_id);
      } else if (nameSlug && participant.name.toLowerCase().includes(nameSlug)) {
        ids.add(participant.meeting_id);
      }
    }
    return ids;
  }

  return null;
}

export function parseAssistantScope(searchParams: {
  escopo?: string;
  id?: string;
  key?: string;
  dias?: string;
}): AssistantScope {
  const type = searchParams.escopo;
  if (type === "serie" && searchParams.id) {
    return { type: "series", seriesId: searchParams.id };
  }
  if (type === "participante" && searchParams.key) {
    return { type: "participant", participantKey: searchParams.key };
  }
  if (type === "recente") {
    const days = Number.parseInt(searchParams.dias ?? "30", 10);
    return { type: "recent", days: Number.isFinite(days) ? days : 30 };
  }
  return { type: "all" };
}
