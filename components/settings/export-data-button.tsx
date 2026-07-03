"use client";

import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExportDataButton() {
  const [loading, setLoading] = useState(false);

  async function exportData() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/export");
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Limite de export atingido (1×/24h)");
        return;
      }
      if (!res.ok) {
        toast.error("Falha ao exportar dados");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `reuniai-export-${new Date().toISOString().slice(0, 10)}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Export iniciado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={() => void exportData()}>
      <DownloadSimple size={16} className="mr-1.5" />
      Exportar meus dados
    </Button>
  );
}
