import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TEMPLATE_LABELS, parseTemplateId } from "@/lib/analysis/template-types";

const FIELD_LABELS: Record<string, string> = {
  yesterday: "Ontem",
  today: "Hoje",
  blockers: "Blockers",
  customer_pain_points: "Dores do cliente",
  objections: "Objeções",
  next_steps: "Próximos passos",
  discussion_topics: "Tópicos discutidos",
  feedback: "Feedback",
  commitments: "Compromissos",
  went_well: "O que foi bem",
  to_improve: "A melhorar",
  candidate_strengths: "Pontos fortes",
  concerns: "Preocupações",
  culture_fit: "Fit cultural",
  recommendation: "Recomendação",
};

type Props = {
  templateId: string | null | undefined;
  templateFields: Record<string, string[] | string> | null | undefined;
};

function renderValue(value: string[] | string): string {
  if (Array.isArray(value)) return value.length ? value.join(" · ") : "—";
  return value.trim() || "—";
}

export function TemplateAnalysisPanel({ templateId, templateFields }: Props) {
  const id = parseTemplateId(templateId ?? undefined);
  const fields = templateFields ?? {};
  const entries = Object.entries(fields).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(String(value).trim());
  });

  if (id === "generic" || entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Análise — {TEMPLATE_LABELS[id]}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {FIELD_LABELS[key] ?? key}
            </p>
            <p className="mt-1 text-sm">{renderValue(value)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
