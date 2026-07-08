"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function TranscriptSyncButton({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function sync() {
    setLoading(true);
    try {
      const res = await fetch("/api/bots/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao buscar transcrição.");
        return;
      }
      toast.success(
        data?.segments > 0
          ? `Transcrição atualizada (${data.segments} trechos).${
              data?.analysis === "scheduled" ? " Análise por IA em andamento." : ""
            }`
          : "Sem trechos disponíveis ainda."
      );
      router.refresh();
    } catch {
      toast.error("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={sync}>
      {loading ? (
        <Spinner size={14} className="animate-spin" />
      ) : (
        <ArrowsClockwise size={14} />
      )}
      Buscar transcrição
    </Button>
  );
}
