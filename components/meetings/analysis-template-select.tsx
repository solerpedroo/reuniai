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

export function AnalysisTemplateSelect({
  meetingId,
  initialTemplate,
}: {
  meetingId: string;
  initialTemplate: AnalysisTemplateId | null;
}) {
  const [value, setValue] = useState<string>(initialTemplate ?? "auto");
  const [busy, setBusy] = useState(false);

  async function onChange(next: string) {
    setValue(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/analysis-template`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_template: next === "auto" ? null : next,
        }),
      });
      if (!res.ok) {
        toast.error("Falha ao salvar template");
        return;
      }
      toast.success("Template de análise atualizado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Sparkle size={14} className="text-brand" />
      <span className="text-muted-foreground">Template:</span>
      <Select value={value} onValueChange={(v) => void onChange(v)} disabled={busy}>
        <SelectTrigger className="h-8 w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Auto (título / série)</SelectItem>
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
