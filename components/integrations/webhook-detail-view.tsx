"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Plugs, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatNotificationTimestamp } from "@/lib/notifications/format-relative-time";
import type { IntegrationLogEntry } from "@/lib/integrations/hub";
import type { IntegrationEvent } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

const EVENT_LABELS: Record<IntegrationEvent, string> = {
  "meeting.completed": "Reunião processada",
  "action_item.created": "Tarefa criada",
};

export function WebhookDetailView({
  webhook,
  initialLogs,
}: {
  webhook: {
    id: string;
    maskedUrl: string;
    events: IntegrationEvent[];
    enabled: boolean;
    description: string | null;
  };
  initialLogs: IntegrationLogEntry[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [testing, setTesting] = useState(false);

  const reloadLogs = useCallback(async () => {
    const res = await fetch(`/api/integrations/logs?webhookId=${webhook.id}&limit=50`);
    if (!res.ok) return;
    const data = (await res.json()) as { logs: IntegrationLogEntry[] };
    setLogs(data.logs);
  }, [webhook.id]);

  async function testWebhook() {
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "webhook", id: webhook.id }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha no teste");
      toast.success(data.message ?? "Webhook respondeu");
      void reloadLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no teste");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/integracoes">
          <ArrowLeft size={16} className="mr-1.5" aria-hidden />
          Voltar ao hub
        </Link>
      </Button>

      <div className="surface-card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Plugs size={18} aria-hidden />
              Webhook
            </p>
            <p className="mt-1 font-mono text-sm">{webhook.maskedUrl}</p>
            {webhook.description && (
              <p className="mt-1 text-sm text-muted-foreground">{webhook.description}</p>
            )}
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              webhook.enabled
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-muted text-muted-foreground"
            )}
          >
            {webhook.enabled ? "Ativo" : "Desativado"}
          </span>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Eventos inscritos</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {webhook.events.map((event) => (
              <li
                key={event}
                className="rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 text-xs"
              >
                {EVENT_LABELS[event]}
              </li>
            ))}
          </ul>
        </div>

        <Button type="button" size="sm" disabled={testing} onClick={() => void testWebhook()}>
          Testar webhook
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Histórico de disparos</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum disparo registrado.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="surface-card flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium">{log.event}</p>
                  <p className="text-xs text-muted-foreground">{log.summary}</p>
                  {log.meetingId && (
                    <Link
                      href={`/reunioes/${log.meetingId}`}
                      className="mt-1 inline-block text-xs text-brand hover:underline"
                    >
                      {log.meetingTitle ?? "Abrir reunião"}
                    </Link>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      log.status === "delivered" ? "text-emerald-600" : "text-destructive"
                    )}
                  >
                    {log.status === "delivered" ? (
                      <CheckCircle size={14} aria-hidden />
                    ) : (
                      <XCircle size={14} aria-hidden />
                    )}
                    {log.status === "delivered" ? "OK" : "Erro"}
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatNotificationTimestamp(log.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
