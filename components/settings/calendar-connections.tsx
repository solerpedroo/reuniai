"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, CheckCircle, LinkBreak } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GoogleIcon, OutlookIcon } from "@/components/brand/provider-icons";
import type { CalendarProvider } from "@/lib/supabase/types";

type ProviderCardProps = {
  provider: CalendarProvider;
  label: string;
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
  connectHref: string;
  onSync: () => void;
  onDisconnect: () => void;
  syncing: boolean;
  disconnecting: boolean;
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

function ProviderCard({
  provider,
  label,
  connected,
  email,
  lastSyncedAt,
  connectHref,
  onSync,
  onDisconnect,
  syncing,
  disconnecting,
}: ProviderCardProps) {
  const renderIcon = (px: number) =>
    provider === "outlook" ? <OutlookIcon size={px} /> : <GoogleIcon size={px} />;

  if (!connected) {
    return (
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {renderIcon(18)}
          {label}
        </div>
        <p className="text-sm text-muted-foreground">
          {provider === "outlook"
            ? "Sincronize eventos Outlook/Teams e importe transcripts nativos."
            : "Mapeie reuniões Meet/Zoom e artifacts nativos do Google Workspace."}
        </p>
        <Button asChild size="sm">
          <a href={connectHref}>
            {renderIcon(16)}
            Conectar {label}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle size={18} weight="fill" className="text-emerald-500" />
        {renderIcon(16)}
        <span className="font-medium">{email}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Última sincronização: {formatLastSync(lastSyncedAt)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onSync} disabled={syncing}>
          <ArrowsClockwise size={15} className={syncing ? "animate-spin" : undefined} />
          {syncing ? "Sincronizando…" : "Sincronizar"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDisconnect}
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

type ConnectionState = {
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
};

type Props = {
  google: ConnectionState;
  outlook: ConnectionState;
};

export function CalendarConnections({ google, outlook }: Props) {
  const router = useRouter();
  const [syncingProvider, setSyncingProvider] = useState<CalendarProvider | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<CalendarProvider | null>(
    null
  );
  const [, startSync] = useTransition();

  function handleSync(provider: CalendarProvider) {
    setSyncingProvider(provider);
    startSync(async () => {
      try {
        const res = await fetch("/api/calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });
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
          `${provider === "outlook" ? "Outlook" : "Google"}: ${data.inserted ?? 0} novas, ${data.updated ?? 0} atualizadas.`
        );
        router.refresh();
      } catch {
        toast.error("Falha na sincronização");
      } finally {
        setSyncingProvider(null);
      }
    });
  }

  async function handleDisconnect(provider: CalendarProvider) {
    setDisconnectingProvider(provider);
    try {
      const res = await fetch("/api/calendar/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) {
        toast.error("Falha ao desconectar");
        return;
      }
      toast.success("Calendário desconectado");
      router.refresh();
    } catch {
      toast.error("Falha ao desconectar");
    } finally {
      setDisconnectingProvider(null);
    }
  }

  return (
    <div className="space-y-3">
      <ProviderCard
        provider="google"
        label="Google Calendar"
        connected={google.connected}
        email={google.email}
        lastSyncedAt={google.lastSyncedAt}
        connectHref="/api/calendar/connect?provider=google"
        onSync={() => handleSync("google")}
        onDisconnect={() => void handleDisconnect("google")}
        syncing={syncingProvider === "google"}
        disconnecting={disconnectingProvider === "google"}
      />
      <ProviderCard
        provider="outlook"
        label="Outlook Calendar"
        connected={outlook.connected}
        email={outlook.email}
        lastSyncedAt={outlook.lastSyncedAt}
        connectHref="/api/calendar/connect?provider=outlook"
        onSync={() => handleSync("outlook")}
        onDisconnect={() => void handleDisconnect("outlook")}
        syncing={syncingProvider === "outlook"}
        disconnecting={disconnectingProvider === "outlook"}
      />
    </div>
  );
}
