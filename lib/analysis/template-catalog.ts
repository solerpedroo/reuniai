export type TemplateSection = {
  id: string;
  label: string;
  enabled: boolean;
  promptHint?: string;
};

export type AnalysisTemplateRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sections: TemplateSection[];
  is_builtin: boolean;
  user_id: string | null;
  updated_at: string;
};

export const DEFAULT_TEMPLATE_SECTIONS: TemplateSection[] = [
  { id: "executive_summary", label: "Resumo executivo", enabled: true },
  { id: "topics", label: "Tópicos discutidos", enabled: true },
  { id: "decisions", label: "Decisões", enabled: true },
  { id: "action_items", label: "Próximos passos", enabled: true },
];

export function slugifyTemplateName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
