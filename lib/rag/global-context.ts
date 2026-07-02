import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { resolveScopedMeetingIds } from "@/lib/assistant/scope";
import type { AssistantScope } from "@/lib/assistant/types";
import { truncateNotePreview } from "@/lib/participants/notes";
import { formatTimestamp } from "@/lib/meetings/transcript";
import { globalSearch } from "@/lib/search/global-search";

type Client = Awaited<ReturnType<typeof createClient>>;

export type GlobalContextSegment = {
  index: number;
  meetingId: string;
  meetingTitle: string;
  startMs: number;
  speaker: string;
  text: string;
};

export type GlobalContext = {
  segments: GlobalContextSegment[];
  participantNotes: string[];
  meetingCount: number;
};

export async function buildGlobalContext(
  supabase: Client,
  question: string,
  scope: AssistantScope,
  options: { includeParticipantNotes?: boolean } = {}
): Promise<GlobalContext> {
  const scopedIds = await resolveScopedMeetingIds(supabase, scope);
  const search = await globalSearch(supabase, question);

  let hits = search.hits;
  if (scopedIds) {
    hits = hits.filter((hit) => scopedIds.has(hit.meetingId));
  }

  if (hits.length === 0 && scopedIds && scopedIds.size > 0) {
    const { data: meetings } = await supabase
      .from("meetings")
      .select("id, title, started_at")
      .in("id", [...scopedIds])
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(5);

    for (const meeting of meetings ?? []) {
      const row = meeting as { id: string; title: string; started_at: string };
      const { data: segments } = await supabase
        .from("transcript_segments")
        .select("id, start_ms, speaker_label, text")
        .eq("meeting_id", row.id)
        .order("sequence", { ascending: true })
        .limit(3);

      for (const segment of segments ?? []) {
        const typed = segment as {
          start_ms: number;
          speaker_label: string;
          text: string;
        };
        hits.push({
          meetingId: row.id,
          meetingTitle: row.title,
          startedAt: row.started_at,
          segmentId: row.id,
          startMs: typed.start_ms,
          speaker: typed.speaker_label,
          snippet: typed.text.slice(0, 160),
          score: 0.5,
          mode: "text",
        });
      }
    }
  }

  const segments: GlobalContextSegment[] = hits.slice(0, 16).map((hit, index) => ({
    index,
    meetingId: hit.meetingId,
    meetingTitle: hit.meetingTitle,
    startMs: hit.startMs,
    speaker: hit.speaker,
    text: hit.snippet,
  }));

  const participantNotes: string[] = [];
  if (options.includeParticipantNotes) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: notes } = await supabase
        .from("participant_notes")
        .select("body")
        .eq("user_id", user.id)
        .limit(5);

      for (const row of notes ?? []) {
        const body = (row as { body: string }).body.trim();
        if (body) participantNotes.push(truncateNotePreview(body, 200));
      }
    }
  }

  const meetingIds = new Set(segments.map((s) => s.meetingId));

  return {
    segments,
    participantNotes,
    meetingCount: scopedIds?.size ?? meetingIds.size,
  };
}

export function formatGlobalContextForPrompt(context: GlobalContext): string {
  const lines: string[] = [];

  if (context.participantNotes.length > 0) {
    lines.push(
      "Notas privadas sobre participantes (opt-in do usuário):",
      ...context.participantNotes.map((note) => `- ${note}`),
      ""
    );
  }

  if (context.segments.length === 0) {
    lines.push("Nenhum trecho de transcrição encontrado para esta pergunta.");
    return lines.join("\n");
  }

  lines.push("Trechos de reuniões (numerados):");
  for (const segment of context.segments) {
    lines.push(
      `[#${segment.index} · ${segment.meetingTitle} · ${formatTimestamp(segment.startMs)}] ${segment.speaker}: ${segment.text}`
    );
  }

  return lines.join("\n");
}
