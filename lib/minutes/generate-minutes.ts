import "server-only";

import { z } from "zod";
import { generateJson } from "@/lib/llm/client";
import type { createAdminClient } from "@/lib/supabase/admin";
import { getActionItems, getMeetingSummary } from "@/lib/meetings/insights";
import { formatMeetingDate } from "@/lib/meetings/types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

type AdminClient = ReturnType<typeof createAdminClient>;

const MinutesSchema = z.object({
  presentes: z.array(z.string()).default([]),
  pauta: z.array(z.string()).default([]),
  deliberacoes: z.array(z.string()).default([]),
  encaminhamentos: z
    .array(z.object({ titulo: z.string(), responsavel: z.string().nullable().default(null) }))
    .default([]),
  proxima_reuniao: z.string().nullable().default(null),
});

export type MeetingMinutesContent = z.infer<typeof MinutesSchema> & {
  meeting_title: string;
  meeting_date: string;
};

export type MeetingMinutesRow = {
  id: string;
  meeting_id: string;
  user_id: string;
  content_md: string;
  content_json: MeetingMinutesContent;
  generated_at: string;
};

function minutesToMarkdown(content: MeetingMinutesContent): string {
  const lines = [
    `# Ata — ${content.meeting_title}`,
    "",
    `**Data:** ${content.meeting_date}`,
    "",
    "## Presentes",
    ...(content.presentes.length ? content.presentes.map((p) => `- ${p}`) : ["- (não identificados)"]),
    "",
    "## Pauta",
    ...(content.pauta.length ? content.pauta.map((p) => `- ${p}`) : ["- (inferida do resumo)"]),
    "",
    "## Deliberações",
    ...(content.deliberacoes.length
      ? content.deliberacoes.map((d) => `- ${d}`)
      : ["- Nenhuma deliberação registrada"]),
    "",
    "## Encaminhamentos",
    ...(content.encaminhamentos.length
      ? content.encaminhamentos.map(
          (e) => `- ${e.titulo}${e.responsavel ? ` — *${e.responsavel}*` : ""}`
        )
      : ["- Nenhum encaminhamento"]),
  ];

  if (content.proxima_reuniao) {
    lines.push("", "## Próxima reunião", `- ${content.proxima_reuniao}`);
  }

  return lines.join("\n");
}

export async function generateMeetingMinutes(
  admin: AdminClient,
  userId: string,
  meetingId: string
): Promise<MeetingMinutesRow> {
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, started_at")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string; title: string; started_at: string }>();

  if (!meeting || meeting.user_id !== userId) {
    throw new Error("Reunião não encontrada.");
  }

  const supabase = admin as unknown as Client;
  const [summary, actionItems, participantsRes] = await Promise.all([
    getMeetingSummary(supabase, meetingId),
    getActionItems(supabase, meetingId),
    admin.from("participants").select("name, email").eq("meeting_id", meetingId),
  ]);

  if (!summary) {
    throw new Error("Reunião ainda não analisada — gere o resumo antes da ata.");
  }

  const participantNames = (participantsRes.data ?? [])
    .map((p) => p.name?.trim() || p.email?.split("@")[0] || "")
    .filter(Boolean);

  const system = [
    "Você redige atas formais de reunião em português do Brasil.",
    "Use tom profissional, objetivo e factual.",
    "NÃO invente participantes ou decisões ausentes na transcrição/resumo.",
  ].join(" ");

  const user = [
    `Título: ${meeting.title}`,
    `Resumo executivo: ${summary.executive_summary}`,
    `Tópicos: ${JSON.stringify(summary.topics ?? [])}`,
    `Decisões: ${JSON.stringify(summary.decisions ?? [])}`,
    `Action items: ${JSON.stringify(
      actionItems.map((item) => ({
        title: item.title,
        assignee: item.assignee,
        due_date: item.due_date,
      }))
    )}`,
    participantNames.length ? `Participantes conhecidos: ${participantNames.join(", ")}` : null,
    "",
    'Retorne JSON: { "presentes": [], "pauta": [], "deliberacoes": [], "encaminhamentos": [{ "titulo", "responsavel" }], "proxima_reuniao": null }',
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await generateJson({ system, user });
  const parsed = MinutesSchema.parse(raw);

  const contentJson: MeetingMinutesContent = {
    ...parsed,
    meeting_title: meeting.title,
    meeting_date: formatMeetingDate(meeting.started_at),
  };

  const contentMd = minutesToMarkdown(contentJson);

  const { data, error } = await admin
    .from("meeting_minutes")
    .upsert(
      {
        meeting_id: meetingId,
        user_id: userId,
        content_md: contentMd,
        content_json: contentJson,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "meeting_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao salvar ata.");
  }

  return data as unknown as MeetingMinutesRow;
}

export async function getMinutesHub(
  supabase: Client,
  userId: string
): Promise<{ items: (MeetingMinutesRow & { meeting_title?: string })[]; count: number }> {
  const { data, error } = await supabase
    .from("meeting_minutes")
    .select("*")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const items = (data ?? []) as unknown as MeetingMinutesRow[];
  const meetingIds = items.map((i) => i.meeting_id);
  const titles = new Map<string, string>();

  if (meetingIds.length > 0) {
    const { data: meetings } = await supabase
      .from("meetings")
      .select("id, title")
      .in("id", meetingIds)
      .returns<{ id: string; title: string }[]>();
    for (const m of meetings ?? []) {
      titles.set(m.id, m.title);
    }
  }

  return {
    items: items.map((item) => ({
      ...item,
      meeting_title: titles.get(item.meeting_id),
    })),
    count: items.length,
  };
}

export async function getMinutesForMeeting(
  supabase: Client,
  meetingId: string
): Promise<MeetingMinutesRow | null> {
  const { data } = await supabase
    .from("meeting_minutes")
    .select("*")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  return (data as unknown as MeetingMinutesRow | null) ?? null;
}
