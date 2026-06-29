"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, CalendarBlank, CheckCircle, GoogleLogo, LinkBreak } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
};

function formatLastSync(iso: string | null): string {
  if (!iso) return "Nunca sincronizado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function CalendarConnection({ connected, email, lastSyncedAt }: Props) {
  const router = useRouter();
  const [syncing, startSync] = useTransition();
  const [disconnecting, setDisconnecting] = useState(false);

  function handleSync() {
    startSync(async () => {
      try {
        const res = await fetch("/api/calendar/sync", { method: "POST" });
        const data = (await res.json()) as {
          error?: string;
          inserted?: number;
          updated?: number;
        };
        if (!res.ok) {
          toast.error(data.error ?? "Falha na sincronização");
          return;
        }
        toast.success(
          `Sincronizado: ${data.inserted ?? 0} novas, ${data.updated ?? 0} atualizadas.`
        );
        router.refresh();
      } catch {
        toast.error("Falha na sincronização");
      }
    });
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (!res.ok) {
        toast.error("Falha ao desconectar");
        return;
      }
      toast.success("Calendário desconectado");
      router.refresh();
    } catch {
      toast.error("Falha ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!connected) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-center">
          <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CalendarBlank size={20} />
          </span>
          <p className="text-sm text-muted-foreground">
            Conecte seu Google Calendar para mapear reuniões automaticamente.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <a href="/api/calendar/connect">
            <GoogleLogo size={16} weight="bold" />
            Conectar Google Calendar
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border border-success/25 bg-success/10 px-4 py-3"
        )}
      >
        <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-success" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{email}</p>
          <p className="text-xs text-muted-foreground">
            Última sincronização: {formatLastSync(lastSyncedAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <ArrowsClockwise size={15} className={syncing ? "animate-spin" : undefined} />
          {syncing ? "Sincronizando…" : "Sincronizar agora"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-destructive hover:text-destructive"
        >
          <LinkBreak size={15} />
          Desconectar
        </Button>
      </div>
    </div>
  );
}
