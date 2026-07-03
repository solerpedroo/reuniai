"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, LinkBreak, Plugs } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ConnectionRow = {
  provider: "todoist" | "google_tasks";
  external_account_label: string | null;
  enabled: boolean;
  last_synced_at: string | null;
};

const PROVIDER_LABELS: Record<ConnectionRow["provider"], string> = {
  todoist: "Todoist",
  google_tasks: "Google Tasks",
};

export function TaskSyncSettings() {
  const router = useRouter();
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/integrations/task-sync");
    if (res.ok) {
      const data = (await res.json()) as { connections: ConnectionRow[] };
      setConnections(data.connections);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function isConnected(provider: ConnectionRow["provider"]) {
    return connections.some((c) => c.provider === provider);
  }

  async function disconnect(provider: ConnectionRow["provider"]) {
    const res = await fetch(`/api/integrations/task-sync?provider=${provider}`, {
      method: "DELETE",
    });
    if (!res.ok) return toast.error("Falha ao desconectar");
    toast.success(`${PROVIDER_LABELS[provider]} desconectado`);
    router.refresh();
    void refresh();
  }

  async function pullSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/task-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull" }),
      });
      const data = (await res.json().catch(() => ({}))) as { updated?: number; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao sincronizar");
        return;
      }
      toast.success(
        data.updated ? `${data.updated} tarefa(s) atualizada(s).` : "Nada novo para importar."
      );
      router.refresh();
      void refresh();
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plugs className="size-4" weight="duotone" />
          Sync de tarefas
        </CardTitle>
        <CardDescription>
          Action items do ReuniAI espelhados no Todoist ou Google Tasks — conclusões voltam
          automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild disabled={isConnected("todoist")}>
            <Link href="/api/integrations/todoist/connect">
              {isConnected("todoist") ? "Todoist conectado" : "Conectar Todoist"}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild disabled={isConnected("google_tasks")}>
            <Link href="/api/integrations/google-tasks/connect">
              {isConnected("google_tasks") ? "Google Tasks conectado" : "Conectar Google Tasks"}
            </Link>
          </Button>
          {connections.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => void pullSync()} disabled={syncing}>
              <ArrowsClockwise className="size-4" />
              Importar status
            </Button>
          )}
        </div>

        {connections.length > 0 && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {connections.map((conn) => (
              <li key={conn.provider} className="flex items-center justify-between gap-2">
                <span>
                  {PROVIDER_LABELS[conn.provider]}
                  {conn.last_synced_at
                    ? ` · último sync ${new Date(conn.last_synced_at).toLocaleString("pt-BR")}`
                    : ""}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void disconnect(conn.provider)}
                >
                  <LinkBreak className="size-4" />
                  Desconectar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
