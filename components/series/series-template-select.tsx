"use client";

import { useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANALYSIS_TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type AnalysisTemplateId,
} from "@/lib/analysis/template-types";

export function SeriesTemplateSelect({
  recurringEventId,
  initialTemplate,
}: {
  recurringEventId: string;
  initialTemplate: AnalysisTemplateId | null;
}) {
  const [value, setValue] = useState(initialTemplate ?? "generic");
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 text-sm sm:w-auto">
      <Sparkle size={14} className="shrink-0 text-brand" />
      <span className="shrink-0 text-muted-foreground">Template da série:</span>
      <Select
        value={value}
        disabled={busy}
        onValueChange={(v) => {
          const next = v as AnalysisTemplateId;
          setValue(next);
          setBusy(true);
          void fetch(`/api/series/${encodeURIComponent(recurringEventId)}/analysis-template`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysis_template: next }),
          })
            .then((res) => {
              if (!res.ok) throw new Error();
              toast.success("Template da série salvo");
            })
            .catch(() => toast.error("Falha ao salvar template"))
            .finally(() => setBusy(false));
        }}
      >
        <SelectTrigger className="h-8 w-full min-w-0 sm:w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ANALYSIS_TEMPLATE_IDS.map((id) => (
            <SelectItem key={id} value={id}>
              {TEMPLATE_LABELS[id]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
