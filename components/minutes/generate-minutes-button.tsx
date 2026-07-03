"use client";

import { useState } from "react";
import { FileText } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function GenerateMinutesButton({ meetingId }: { meetingId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/minutes`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao gerar ata.");
        return;
      }
      toast.success("Ata gerada.");
      window.location.href = "/atas";
    } catch {
      toast.error("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate} disabled={loading}>
      <FileText className="size-4" />
      {loading ? "Gerando…" : "Gerar ata"}
    </Button>
  );
}
