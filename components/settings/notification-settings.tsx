"use client";

import { useCallback, useState } from "react";
import { BellRinging } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_KIND_LABELS } from "@/lib/notifications/kinds";
import type { NotificationPrefs } from "@/lib/workflow/types";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

const IN_APP_TOGGLES: Array<{
  key: keyof Pick<
    NotificationPrefs,
    "prep" | "completed" | "bot_failed" | "tasks_due" | "review_queue"
  >;
  description: string;
}> = [
  {
    key: "prep",
    description: "Briefing ~10 min antes de calls com histórico de participantes",
  },
  {
    key: "completed",
    description: "Quando resumo e follow-up estiverem prontos para revisão",
  },
  {
    key: "bot_failed",
    description: "Quando o bot não conseguir entrar na reunião",
  },
  {
    key: "tasks_due",
    description: "Lembrete matinal de action items vencendo hoje (fuso do perfil)",
  },
  {
    key: "review_queue",
    description: "Digest matinal quando a fila /revisar passa de 3 reuniões pendentes",
  },
];

function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window;
}

export function NotificationSettings({
  initialPrefs,
  emailEnabled = false,
  pushEnabled = false,
}: {
  initialPrefs: NotificationPrefs;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
}) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [pushLoading, setPushLoading] = useState(false);

  const savePrefs = useCallback(async (next: NotificationPrefs) => {
    setPrefs(next);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification_prefs: next }),
    });
    if (!res.ok) toast.error("Falha ao salvar preferências");
  }, []);

  const enablePush = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push não suportado neste navegador");
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast.error("Notificações push indisponíveis no momento");
      return;
    }

    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      if (!res.ok) throw new Error("Falha ao registrar push");
      await savePrefs({ ...prefs, push: true });
      toast.success("Notificações push ativadas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao ativar push");
    } finally {
      setPushLoading(false);
    }
  }, [prefs, savePrefs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRinging size={18} className="text-brand" />
          Centro de alertas
        </CardTitle>
        <CardDescription>
          Controle in-app e push por tipo de evento. O fuso horário dos lembretes matinais está em
          Meu perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!emailEnabled ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            Notificações por email não estão disponíveis no momento.
          </p>
        ) : (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-100">
            Notificações por email ativas no endereço da sua conta.
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Email de resumo</p>
            <p className="text-xs text-muted-foreground">
              Receba resumo por email quando a reunião for processada
            </p>
          </div>
          <Switch
            checked={prefs.email}
            onCheckedChange={(email) => void savePrefs({ ...prefs, email })}
            disabled={!emailEnabled}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Digest semanal</p>
            <p className="text-xs text-muted-foreground">
              Resumo por email aos domingos (reuniões, decisões e prazos)
            </p>
          </div>
          <Switch
            checked={prefs.digest ?? true}
            onCheckedChange={(digest) => void savePrefs({ ...prefs, digest })}
            disabled={!emailEnabled}
          />
        </div>

        <div className="border-t border-border/70 pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Alertas in-app
          </p>
          <div className="space-y-4">
            {IN_APP_TOGGLES.map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{NOTIFICATION_KIND_LABELS[toggle.key]}</p>
                  <p className="text-xs text-muted-foreground">{toggle.description}</p>
                </div>
                <Switch
                  checked={prefs[toggle.key] ?? true}
                  onCheckedChange={(value) =>
                    void savePrefs({ ...prefs, [toggle.key]: value })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {!pushEnabled ? (
          <p className="rounded-md border border-muted px-3 py-2 text-xs text-muted-foreground">
            Notificações push não estão disponíveis no momento.
          </p>
        ) : !isPushSupported() ? (
          <p className="rounded-md border border-muted px-3 py-2 text-xs text-muted-foreground">
            Este navegador não suporta notificações push.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4">
          <div>
            <p className="text-sm font-medium">Push no navegador</p>
            <p className="text-xs text-muted-foreground">
              Replica os alertas acima no dispositivo (requer PWA ou aba aberta)
            </p>
          </div>
          {prefs.push ? (
            <Switch
              checked
              onCheckedChange={async () => {
                try {
                  const registration = await navigator.serviceWorker.ready;
                  const subscription = await registration.pushManager.getSubscription();
                  if (subscription) {
                    await fetch("/api/notifications/subscribe", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ endpoint: subscription.endpoint }),
                    });
                    await subscription.unsubscribe();
                  }
                } catch {
                  // best effort
                }
                await savePrefs({ ...prefs, push: false });
              }}
            />
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={enablePush}
              disabled={pushLoading || !pushEnabled || !isPushSupported()}
            >
              Ativar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
