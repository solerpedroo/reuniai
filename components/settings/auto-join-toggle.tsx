"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAutoJoin } from "@/app/(app)/configuracoes/actions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function AutoJoinToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await updateAutoJoin(next);
      if ("error" in res) {
        setEnabled(previous);
        toast.error(res.error);
      } else {
        toast.success(next ? "Auto-join ativado" : "Auto-join desativado");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor="auto-join-toggle">Entrar automaticamente</Label>
        <p className="text-xs text-muted-foreground">
          O ReuniAI entra nas calls agendadas com link de vídeo.
        </p>
      </div>
      <Switch
        id="auto-join-toggle"
        checked={enabled}
        onCheckedChange={handleChange}
        disabled={isPending}
      />
    </div>
  );
}
