"use client";

import { useCallback, useState } from "react";
import { BellRinging } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { NotificationPrefs } from "@/lib/workflow/types";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function NotificationSettings({
  initialPrefs,
}: {
  initialPrefs: NotificationPrefs;
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
      toast.error("Push não configurado no servidor");
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
          Notificações
        </CardTitle>
        <CardDescription>Alertas de prep, conclusão de reuniões e push no navegador</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Email de resumo</p>
            <p className="text-xs text-muted-foreground">
              Receba resumo por email quando a reunião for processada (requer Resend)
            </p>
          </div>
          <Switch
            checked={prefs.email}
            onCheckedChange={(email) => void savePrefs({ ...prefs, email })}
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
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Prep de reunião</p>
            <p className="text-xs text-muted-foreground">Briefing antes de calls com histórico</p>
          </div>
          <Switch
            checked={prefs.prep}
            onCheckedChange={(prep) => void savePrefs({ ...prefs, prep })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Reunião concluída</p>
            <p className="text-xs text-muted-foreground">Quando resumo e follow-up estiverem prontos</p>
          </div>
          <Switch
            checked={prefs.completed}
            onCheckedChange={(completed) => void savePrefs({ ...prefs, completed })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Push no navegador</p>
            <p className="text-xs text-muted-foreground">Requer PWA instalado ou aba aberta</p>
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
            <Button size="sm" variant="outline" onClick={enablePush} disabled={pushLoading}>
              Ativar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
