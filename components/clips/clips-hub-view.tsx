"use client";

import { useCallback, useState } from "react";
import { Copy, LinkSimple, Prohibit, Timer } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ClipsHub } from "@/lib/clips/hub";
import { formatMeetingDate } from "@/lib/meetings/types";
import { formatTimestamp } from "@/lib/meetings/transcript";

export function ClipsHubView({ hub }: { hub: ClipsHub }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  }, []);

  async function patchClip(id: string, action: "extend" | "revoke") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/clips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, days: 7 }),
      });
      if (!res.ok) throw new Error("Falha");
      toast.success(action === "revoke" ? "Clip revogado" : "Validade estendida");
      window.location.reload();
    } catch {
      toast.error("Falha ao atualizar clip");
    } finally {
      setBusyId(null);
    }
  }

  if (hub.items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum clip ativo. Marque um momento na reunião e use &quot;Compartilhar clip&quot;.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {hub.items.map((item) => (
        <li key={item.id} className="surface-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{item.caption}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.meetingTitle} · {formatTimestamp(item.start_ms)} ·{" "}
                {formatMeetingDate(item.created_at)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.isActive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Timer size={12} />
                    Expira {formatMeetingDate(item.expires_at)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Inativo</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!item.isActive || busyId === item.id}
                onClick={() => void copyUrl(item.shareUrl)}
              >
                <Copy size={14} className="mr-1" />
                Copiar
              </Button>
              {item.isActive ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() => void patchClip(item.id, "extend")}
                  >
                    <LinkSimple size={14} className="mr-1" />
                    +7 dias
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === item.id}
                    onClick={() => void patchClip(item.id, "revoke")}
                  >
                    <Prohibit size={14} className="mr-1" />
                    Revogar
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
