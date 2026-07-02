import "server-only";

import type { createClient } from "@/lib/supabase/server";
import {
  encodeParticipantKey,
  normalizeEmail,
  participantKey,
} from "@/lib/participants/normalize";
import type { CommandSearchHit } from "@/lib/command/types";
import { getReviewQueueCounts } from "@/lib/review/review-queue";
import { formatMeetingDate } from "@/lib/meetings/types";

type Client = Awaited<ReturnType<typeof createClient>>;

const KEYWORD_ACTIONS: { keywords: string[]; hit: CommandSearchHit }[] = [
  {
    keywords: ["revisar", "revisão", "fila"],
    hit: {
      id: "action-revisar",
      type: "action",
      label: "Revisar pendências",
      description: "Abrir fila de reuniões para revisar",
      href: "/revisar",
    },
  },
  {
    keywords: ["agenda", "hoje", "dia"],
    hit: {
      id: "action-agenda",
      type: "action",
      label: "Agenda de hoje",
      description: "Ver reuniões e tarefas do dia",
      href: "/agenda",
    },
  },
  {
    keywords: ["semana", "semanal"],
    hit: {
      id: "action-semana",
      type: "action",
      label: "Revisão semanal",
      description: "Fechar a semana e planejar a próxima",
      href: "/semana",
    },
  },
  {
    keywords: ["tarefa", "tarefas", "compromisso"],
    hit: {
      id: "action-tarefas",
      type: "action",
      label: "Inbox de tarefas",
      description: "Action items de todas as reuniões",
      href: "/tarefas",
    },
  },
  {
    keywords: ["participante", "pessoas", "contatos"],
    hit: {
      id: "action-participantes",
      type: "action",
      label: "Diretório de participantes",
      description: "Pessoas com quem você se reuniu",
      href: "/participantes",
    },
  },
  {
    keywords: ["speaker", "speakers", "voz", "transcrição"],
    hit: {
      id: "action-speakers",
      type: "action",
      label: "Hub de speakers",
      description: "Mapear Speaker 1 → nome real",
      href: "/speakers",
    },
  },
  {
    keywords: ["série", "series", "standup", "recorrente"],
    hit: {
      id: "action-series",
      type: "action",
      label: "Séries recorrentes",
      description: "Hub de standups e syncs",
      href: "/series",
    },
  },
  {
    keywords: ["assistente", "ia", "perguntar", "chat"],
    hit: {
      id: "action-assistente",
      type: "action",
      label: "Assistente global",
      description: "Perguntas sobre todas as reuniões",
      href: "/assistente",
    },
  },
  {
    keywords: ["destaque", "destaques", "bookmark", "momento"],
    hit: {
      id: "action-destaques",
      type: "action",
      label: "Biblioteca de destaques",
      description: "Momentos marcados nas reuniões",
      href: "/destaques",
    },
  },
];

function matchKeywordActions(term: string): CommandSearchHit[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];

  return KEYWORD_ACTIONS.filter(({ keywords }) =>
    keywords.some((keyword) => keyword.includes(normalized) || normalized.includes(keyword))
  ).map(({ hit }) => hit);
}

async function searchMeetings(
  supabase: Client,
  pattern: string
): Promise<CommandSearchHit[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("id, title, started_at")
    .ilike("title", pattern)
    .order("started_at", { ascending: false })
    .limit(5);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const meeting = row as { id: string; title: string; started_at: string };
    return {
      id: `meeting-${meeting.id}`,
      type: "meeting" as const,
      label: meeting.title,
      description: formatMeetingDate(meeting.started_at),
      href: `/reunioes/${meeting.id}`,
    };
  });
}

async function searchTasks(supabase: Client, pattern: string): Promise<CommandSearchHit[]> {
  const { data, error } = await supabase
    .from("action_items")
    .select("id, title, meeting_id, meetings(title)")
    .eq("status", "open")
    .ilike("title", pattern)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(5);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const item = row as {
      id: string;
      title: string;
      meeting_id: string;
      meetings: { title: string } | { title: string }[] | null;
    };
    const meeting = Array.isArray(item.meetings) ? item.meetings[0] : item.meetings;
    return {
      id: `task-${item.id}`,
      type: "task" as const,
      label: item.title,
      description: meeting?.title ?? "Tarefa aberta",
      href: `/reunioes/${item.meeting_id}?tab=tarefas`,
    };
  });
}

async function searchParticipants(
  supabase: Client,
  pattern: string
): Promise<CommandSearchHit[]> {
  const [byNameRes, byEmailRes] = await Promise.all([
    supabase.from("participants").select("name, email").ilike("name", pattern).limit(25),
    supabase.from("participants").select("name, email").ilike("email", pattern).limit(25),
  ]);

  if (byNameRes.error) throw byNameRes.error;
  if (byEmailRes.error) throw byEmailRes.error;

  const seen = new Set<string>();
  const hits: CommandSearchHit[] = [];

  for (const row of [...(byNameRes.data ?? []), ...(byEmailRes.data ?? [])]) {
    const participant = row as { name: string; email: string | null };
    const key = participantKey(participant.email, participant.name);
    if (seen.has(key)) continue;
    seen.add(key);

    hits.push({
      id: `participant-${key}`,
      type: "participant",
      label: participant.name,
      description: normalizeEmail(participant.email) ?? "Participante",
      href: `/participantes/${encodeParticipantKey(key)}`,
    });

    if (hits.length >= 5) break;
  }

  return hits;
}

async function getContextualActions(supabase: Client): Promise<CommandSearchHit[]> {
  const counts = await getReviewQueueCounts(supabase);
  const actions: CommandSearchHit[] = [];

  if (counts.pending > 0) {
    actions.push({
      id: "ctx-revisar",
      type: "action",
      label: "Revisar pendências",
      description: `${counts.pending} reunião${counts.pending === 1 ? "" : "ões"} na fila`,
      href: "/revisar",
    });
  }

  actions.push({
    id: "ctx-agenda",
    type: "action",
    label: "Agenda de hoje",
    description: "Reuniões, tarefas e prep do dia",
    href: "/agenda",
  });

  return actions;
}

export async function searchCommandPalette(
  supabase: Client,
  query: string
): Promise<CommandSearchHit[]> {
  const term = query.trim();
  if (!term) {
    return getContextualActions(supabase);
  }

  const pattern = `%${term}%`;
  const [meetings, tasks, participants, keywordActions] = await Promise.all([
    searchMeetings(supabase, pattern),
    searchTasks(supabase, pattern),
    searchParticipants(supabase, pattern),
    Promise.resolve(matchKeywordActions(term)),
  ]);

  const merged: CommandSearchHit[] = [];
  const seen = new Set<string>();

  for (const hit of [...keywordActions, ...meetings, ...tasks, ...participants]) {
    if (seen.has(hit.href)) continue;
    seen.add(hit.href);
    merged.push(hit);
  }

  return merged.slice(0, 20);
}
