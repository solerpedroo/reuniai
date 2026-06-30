import "server-only";

import { z } from "zod";
import { generateJson } from "@/lib/llm/client";
import {
  type AnalysisTemplateId,
  parseTemplateId,
} from "@/lib/analysis/template-types";

export type { AnalysisTemplateId } from "@/lib/analysis/template-types";
export {
  ANALYSIS_TEMPLATE_IDS,
  TEMPLATE_LABELS,
  detectTemplateFromTitle,
  parseTemplateId,
} from "@/lib/analysis/template-types";

export type NormalizedAnalysis = {
  executive_summary: string;
  topics: { title: string; summary: string }[];
  decisions: string[];
  action_items: { title: string; assignee: string | null; due_date: string | null }[];
  template_id: AnalysisTemplateId;
};

const GenericSchema = z.object({
  executive_summary: z.string().max(2000),
  topics: z.array(z.object({ title: z.string(), summary: z.string() })).default([]),
  decisions: z.array(z.string()).default([]),
  action_items: z
    .array(
      z.object({
        title: z.string(),
        assignee: z.string().nullable().default(null),
        due_date: z.string().nullable().default(null),
      })
    )
    .default([]),
});

const StandupSchema = z.object({
  executive_summary: z.string().max(2000),
  yesterday: z.array(z.string()).default([]),
  today: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  action_items: z
    .array(
      z.object({
        title: z.string(),
        assignee: z.string().nullable().default(null),
        due_date: z.string().nullable().default(null),
      })
    )
    .default([]),
});

const SalesSchema = z.object({
  executive_summary: z.string().max(2000),
  customer_pain_points: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  next_steps: z.array(z.string()).default([]),
  action_items: z
    .array(
      z.object({
        title: z.string(),
        assignee: z.string().nullable().default(null),
        due_date: z.string().nullable().default(null),
      })
    )
    .default([]),
});

const OneOnOneSchema = z.object({
  executive_summary: z.string().max(2000),
  discussion_topics: z.array(z.string()).default([]),
  feedback: z.array(z.string()).default([]),
  commitments: z.array(z.string()).default([]),
  action_items: z
    .array(
      z.object({
        title: z.string(),
        assignee: z.string().nullable().default(null),
        due_date: z.string().nullable().default(null),
      })
    )
    .default([]),
});

const RetrospectiveSchema = z.object({
  executive_summary: z.string().max(2000),
  went_well: z.array(z.string()).default([]),
  to_improve: z.array(z.string()).default([]),
  action_items: z
    .array(
      z.object({
        title: z.string(),
        assignee: z.string().nullable().default(null),
        due_date: z.string().nullable().default(null),
      })
    )
    .default([]),
});

const MAX_TRANSCRIPT_CHARS = 100_000;

function localeLanguage(locale: string): string {
  if (locale.startsWith("en")) return "inglês";
  if (locale.startsWith("es")) return "espanhol";
  return "português do Brasil";
}

export async function analyzeWithTemplate(
  templateId: AnalysisTemplateId,
  transcript: string,
  options: { meetingTitle?: string; locale?: string } = {}
): Promise<NormalizedAnalysis> {
  const resolvedId = parseTemplateId(templateId);
  const trimmed =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcript.slice(0, MAX_TRANSCRIPT_CHARS)
      : transcript;

  const lang = localeLanguage(options.locale ?? "pt-BR");
  const titleLine = options.meetingTitle ? `Título da reunião: ${options.meetingTitle}` : null;

  const baseRules = [
    `Produza o resumo em ${lang}.`,
    "NÃO invente informações, nomes ou datas.",
    "Datas de action items em ISO (YYYY-MM-DD) apenas quando explicitamente mencionadas.",
  ].join(" ");

  if (resolvedId === "standup") {
    const system = [
      "Você analisa standups/dailies.",
      baseRules,
      "NÃO inclua decisões comerciais ou de pricing — foque em ontem, hoje e blockers.",
    ].join(" ");
    const user = [
      titleLine,
      'Retorne JSON: { "executive_summary", "yesterday": [], "today": [], "blockers": [], "action_items": [] }',
      "",
      "Transcrição:",
      trimmed,
    ]
      .filter(Boolean)
      .join("\n");
    const raw = await generateJson({ system, user });
    const parsed = StandupSchema.parse(raw);
    return {
      executive_summary: parsed.executive_summary,
      topics: [
        { title: "Ontem", summary: parsed.yesterday.join("; ") || "—" },
        { title: "Hoje", summary: parsed.today.join("; ") || "—" },
        { title: "Blockers", summary: parsed.blockers.join("; ") || "Nenhum" },
      ],
      decisions: [],
      action_items: parsed.action_items,
      template_id: "standup",
    };
  }

  if (resolvedId === "sales") {
    const system = `Você analisa reuniões de vendas/demo. ${baseRules}`;
    const user = [
      titleLine,
      'Retorne JSON: { "executive_summary", "customer_pain_points": [], "objections": [], "next_steps": [], "action_items": [] }',
      "",
      "Transcrição:",
      trimmed,
    ]
      .filter(Boolean)
      .join("\n");
    const raw = await generateJson({ system, user });
    const parsed = SalesSchema.parse(raw);
    return {
      executive_summary: parsed.executive_summary,
      topics: [
        { title: "Dores do cliente", summary: parsed.customer_pain_points.join("; ") || "—" },
        { title: "Objeções", summary: parsed.objections.join("; ") || "—" },
        { title: "Próximos passos", summary: parsed.next_steps.join("; ") || "—" },
      ],
      decisions: parsed.next_steps,
      action_items: parsed.action_items,
      template_id: "sales",
    };
  }

  if (resolvedId === "one_on_one") {
    const system = `Você analisa reuniões 1:1. ${baseRules}`;
    const user = [
      titleLine,
      'Retorne JSON: { "executive_summary", "discussion_topics": [], "feedback": [], "commitments": [], "action_items": [] }',
      "",
      "Transcrição:",
      trimmed,
    ]
      .filter(Boolean)
      .join("\n");
    const raw = await generateJson({ system, user });
    const parsed = OneOnOneSchema.parse(raw);
    return {
      executive_summary: parsed.executive_summary,
      topics: parsed.discussion_topics.map((t) => ({ title: t, summary: "" })),
      decisions: parsed.commitments,
      action_items: parsed.action_items,
      template_id: "one_on_one",
    };
  }

  if (resolvedId === "retrospective") {
    const system = `Você analisa retrospectivas. ${baseRules}`;
    const user = [
      titleLine,
      'Retorne JSON: { "executive_summary", "went_well": [], "to_improve": [], "action_items": [] }',
      "",
      "Transcrição:",
      trimmed,
    ]
      .filter(Boolean)
      .join("\n");
    const raw = await generateJson({ system, user });
    const parsed = RetrospectiveSchema.parse(raw);
    return {
      executive_summary: parsed.executive_summary,
      topics: [
        { title: "O que foi bem", summary: parsed.went_well.join("; ") || "—" },
        { title: "A melhorar", summary: parsed.to_improve.join("; ") || "—" },
      ],
      decisions: [],
      action_items: parsed.action_items,
      template_id: "retrospective",
    };
  }

  const system = `Você analisa transcrições de reuniões. ${baseRules}`;
  const user = [
    titleLine,
    'Retorne JSON: { "executive_summary", "topics": [{ "title", "summary" }], "decisions": [], "action_items": [] }',
    "",
    "Transcrição:",
    trimmed,
  ]
    .filter(Boolean)
    .join("\n");
  const raw = await generateJson({ system, user });
  const parsed = GenericSchema.parse(raw);
  return {
    executive_summary: parsed.executive_summary,
    topics: parsed.topics,
    decisions: parsed.decisions,
    action_items: parsed.action_items,
    template_id: "generic",
  };
}
