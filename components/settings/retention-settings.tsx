"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateRetentionDays } from "@/app/(app)/configuracoes/actions";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RETENTION_OPTIONS = [
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "180", label: "180 dias" },
  { value: "365", label: "1 ano (padrão)" },
  { value: "730", label: "2 anos" },
];

export function RetentionSettings({ initialDays }: { initialDays: number }) {
  const [days, setDays] = useState(String(initialDays));
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    setDays(value);
    startTransition(async () => {
      const result = await updateRetentionDays(Number(value));
      if ("error" in result) {
        toast.error(result.error);
        setDays(String(initialDays));
        return;
      }
      toast.success("Retenção de dados atualizada.");
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="retention-days">Retenção de reuniões</Label>
      <p className="text-xs text-muted-foreground">
        Reuniões mais antigas que este prazo são excluídas automaticamente (LGPD).
      </p>
      <Select value={days} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger id="retention-days" className="max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RETENTION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
