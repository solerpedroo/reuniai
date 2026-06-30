"use client";

import { useCallback, useState } from "react";
import { Globe } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_LOCALES, type UserLocale } from "@/lib/profile/locale";
import {
  ANALYSIS_TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type AnalysisTemplateId,
} from "@/lib/analysis/template-types";

export function LocaleAndTemplateSettings({
  initialLocale,
  initialDefaultTemplate,
}: {
  initialLocale: UserLocale;
  initialDefaultTemplate: AnalysisTemplateId;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const [template, setTemplate] = useState(initialDefaultTemplate);

  const save = useCallback(async (patch: { locale?: UserLocale; default_analysis_template?: AnalysisTemplateId }) => {
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) toast.error("Falha ao salvar preferências");
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe size={18} className="text-brand" />
          Idioma e análise
        </CardTitle>
        <CardDescription>
          Idioma da transcrição (Vexa) e template padrão para novas reuniões
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Idioma da transcrição</p>
          <Select
            value={locale}
            onValueChange={(v) => {
              const next = v as UserLocale;
              setLocale(next);
              void save({ locale: next });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_LOCALES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Template de análise padrão</p>
          <Select
            value={template}
            onValueChange={(v) => {
              const next = v as AnalysisTemplateId;
              setTemplate(next);
              void save({ default_analysis_template: next });
            }}
          >
            <SelectTrigger>
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
      </CardContent>
    </Card>
  );
}
