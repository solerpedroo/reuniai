"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowSquareOut, CheckCircle, Plugs, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { IntegrationSettings } from "@/components/settings/integration-settings";
import { Button } from "@/components/ui/button";
import { UI_FEATURE_VISIBILITY } from "@/lib/ui/feature-visibility";
import { formatNotificationTimestamp } from "@/lib/notifications/format-relative-time";
import type { IntegrationLogEntry } from "@/lib/integrations/hub";
import { cn } from "@/lib/utils";

export function IntegrationHubView({
  initialLogs,
}: {
  initialLogs: IntegrationLogEntry[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [testing, setTesting] = useState<string | null>(null);

  const reloadLogs = useCallback(async () => {
    const res = await fetch("/api/integrations/logs?limit=30");
    if (!res.ok) return;
    const data = (await res.json()) as { logs: IntegrationLogEntry[] };
    setLogs(data.logs);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => void reloadLogs(), 60_000);
    return () => clearInterval(interval);
  }, [reloadLogs]);

  async function testProvider(provider: "slack" | "notion", label: string) {
    setTesting(provider);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha no teste");
      toast.success(data.message ?? `${label} OK`);
      void reloadLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no teste");
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {UI_FEATURE_VISIBILITY.slackIntegration ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testing === "slack"}
            onClick={() => void testProvider("slack", "Slack")}
          >
            Testar Slack
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={testing === "notion"}
          onClick={() => void testProvider("notion", "Notion")}
        >
          Testar Notion
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <IntegrationSettings />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Plugs size={16} aria-hidden />
            Log de entregas
          </h2>
          <p className="text-xs text-muted-foreground">
            Disparos recentes de webhooks — últimos 30 dias retidos no banco
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma entrega registrada ainda.
          </div>
        ) : (
          <div className="surface-card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Quando</th>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Destino</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 last:border-b-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatNotificationTimestamp(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">{log.event}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          log.status === "delivered"
                            ? "text-emerald-600"
                            : "text-destructive"
                        )}
                      >
                        {log.status === "delivered" ? (
                          <CheckCircle size={14} aria-hidden />
                        ) : (
                          <XCircle size={14} aria-hidden />
                        )}
                        {log.status === "delivered" ? "Sucesso" : "Erro"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{log.summary}</span>
                        {log.meetingId && (
                          <Link
                            href={`/reunioes/${log.meetingId}`}
                            className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                          >
                            {log.meetingTitle ?? "Reunião"}
                            <ArrowSquareOut size={12} aria-hidden />
                          </Link>
                        )}
                        {log.webhookId && (
                          <Link
                            href={`/integracoes/webhooks/${log.webhookId}`}
                            className="text-xs text-muted-foreground hover:text-brand"
                          >
                            Ver webhook
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
