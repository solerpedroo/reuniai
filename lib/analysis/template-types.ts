export const ANALYSIS_TEMPLATE_IDS = [
  "generic",
  "standup",
  "sales",
  "one_on_one",
  "retrospective",
  "interview",
] as const;

export type AnalysisTemplateId = (typeof ANALYSIS_TEMPLATE_IDS)[number];

export const TEMPLATE_LABELS: Record<AnalysisTemplateId, string> = {
  generic: "Genérico",
  standup: "Standup / Daily",
  sales: "Vendas / Demo",
  one_on_one: "1:1",
  retrospective: "Retrospectiva",
  interview: "Entrevista / Triagem",
};

export function detectTemplateFromTitle(title: string): AnalysisTemplateId | null {
  const t = title.toLowerCase();
  if (/\b(daily|standup|stand-up|scrum)\b/.test(t)) return "standup";
  if (/\b(demo|vendas|sales|pitch)\b/.test(t)) return "sales";
  if (/\b(1:1|1-1|one-on-one|one on one)\b/.test(t)) return "one_on_one";
  if (/\b(retro|retrospectiva|retrospective)\b/.test(t)) return "retrospective";
  if (/\b(entrevista|interview|triagem|screening)\b/.test(t)) return "interview";
  return null;
}

export function parseTemplateId(value: string | null | undefined): AnalysisTemplateId {
  if (value && ANALYSIS_TEMPLATE_IDS.includes(value as AnalysisTemplateId)) {
    return value as AnalysisTemplateId;
  }
  return "generic";
}
