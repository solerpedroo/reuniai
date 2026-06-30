"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LinkBreak, Plugs, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NotionIcon, SlackIcon } from "@/components/brand/provider-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IntegrationEvent } from "@/lib/integrations/types";

type SlackState = {
  connected: boolean;
  team_name: string | null;
  channel_id: string | null;
  channel_name: string | null;
  channels: { id: string; name: string }[];
};

type NotionState = {
  connected: boolean;
  workspace_name: string | null;
};

type WebhookRow = {
  id: string;
  url: string;
  events: IntegrationEvent[];
  description: string | null;
  enabled: boolean;
};

export function IntegrationSettings() {
  const router = useRouter();
  const [slack, setSlack] = useState<SlackState | null>(null);
  const [notion, setNotion] = useState<NotionState | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [slackRes, notionRes, hooksRes] = await Promise.all([
      fetch("/api/integrations/slack"),
      fetch("/api/integrations/notion"),
      fetch("/api/integrations/webhooks"),
    ]);
    if (slackRes.ok) setSlack((await slackRes.json()) as SlackState);
    if (notionRes.ok) setNotion((await notionRes.json()) as NotionState);
    if (hooksRes.ok) {
      const data = (await hooksRes.json()) as { webhooks: WebhookRow[] };
      setWebhooks(data.webhooks);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveSlackChannel(channelId: string, channelName: string) {
    const res = await fetch("/api/integrations/slack", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_id: channelId, channel_name: channelName }),
    });
    if (!res.ok) {
      toast.error("Falha ao salvar canal");
      return;
    }
    toast.success("Canal Slack atualizado");
    void refresh();
  }

  async function disconnectSlack() {
    const res = await fetch("/api/integrations/slack", { method: "DELETE" });
    if (!res.ok) return toast.error("Falha ao desconectar");
    toast.success("Slack desconectado");
    router.refresh();
    void refresh();
  }

  async function disconnectNotion() {
    const res = await fetch("/api/integrations/notion", { method: "DELETE" });
    if (!res.ok) return toast.error("Falha ao desconectar");
    toast.success("Notion desconectado");
    router.refresh();
    void refresh();
  }

  async function createWebhook() {
    if (!newUrl.trim()) return toast.error("Informe a URL");
    const res = await fetch("/api/integrations/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: newUrl.trim(),
        events: ["meeting.completed", "action_item.created"],
      }),
    });
    const data = (await res.json()) as { error?: string; secret?: string };
    if (!res.ok) return toast.error(data.error ?? "Falha ao criar webhook");
    setNewUrl("");
    setNewSecret(data.secret ?? null);
    toast.success("Webhook criado — copie o secret agora");
    void refresh();
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    await fetch(`/api/integrations/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    void refresh();
  }

  async function deleteWebhook(id: string) {
    await fetch(`/api/integrations/webhooks/${id}`, { method: "DELETE" });
    toast.success("Webhook removido");
    void refresh();
  }

  if (loading) {
    return (
      <Card className="md:col-span-2">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Carregando integrações…
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlackIcon size={18} />
            Slack
          </CardTitle>
          <CardDescription>Digest pós-reunião no canal escolhido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!slack?.connected ? (
            <Button asChild size="sm">
              <a href="/api/integrations/slack/connect">
                <SlackIcon size={16} />
                Conectar Slack
              </a>
            </Button>
          ) : (
            <>
              <p className="text-sm font-medium">{slack.team_name}</p>
              {slack.channels.length > 0 ? (
                <div className="space-y-2">
                  <Label>Canal de digest</Label>
                  <Select
                    value={slack.channel_id ?? undefined}
                    onValueChange={(value) => {
                      const ch = slack.channels.find((c) => c.id === value);
                      if (ch) void saveSlackChannel(ch.id, ch.name);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {slack.channels.map((ch) => (
                        <SelectItem key={ch.id} value={ch.id}>
                          #{ch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Convide o app ReuniAI a um canal no Slack para listá-lo aqui.
                </p>
              )}
              <Button variant="ghost" size="sm" onClick={() => void disconnectSlack()}>
                <LinkBreak size={14} />
                Desconectar
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <NotionIcon size={18} />
            Notion
          </CardTitle>
          <CardDescription>Exportar reuniões como páginas no workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!notion?.connected ? (
            <Button asChild size="sm">
              <a href="/api/integrations/notion/connect">
                <NotionIcon size={16} />
                Conectar Notion
              </a>
            </Button>
          ) : (
            <>
              <p className="text-sm font-medium">{notion.workspace_name}</p>
              <p className="text-xs text-muted-foreground">
                Use &quot;Exportar para Notion&quot; na página da reunião.
              </p>
              <Button variant="ghost" size="sm" onClick={() => void disconnectNotion()}>
                <LinkBreak size={14} />
                Desconectar
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plugs size={18} />
            Webhooks outbound
          </CardTitle>
          <CardDescription>
            Zapier, Make ou sua API — eventos com assinatura HMAC SHA-256
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="https://hooks.zapier.com/..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <Button onClick={() => void createWebhook()}>
              <Plus size={14} />
              Adicionar
            </Button>
          </div>

          {newSecret && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">Secret (copie agora — não será exibido novamente):</p>
              <code className="mt-1 block break-all text-xs">{newSecret}</code>
            </div>
          )}

          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum webhook configurado.</p>
          ) : (
            <ul className="space-y-3">
              {webhooks.map((hook) => (
                <li
                  key={hook.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{hook.url}</p>
                    <p className="text-xs text-muted-foreground">
                      {hook.events.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={hook.enabled}
                      onCheckedChange={(enabled) => void toggleWebhook(hook.id, enabled)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void deleteWebhook(hook.id)}
                      aria-label="Remover webhook"
                    >
                      <Trash size={16} className="text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-muted-foreground">
            Documentação:{" "}
            <a href="/docs/integrations/webhooks.md" className="underline" target="_blank" rel="noreferrer">
              webhooks.md
            </a>
          </p>
        </CardContent>
      </Card>
    </>
  );
}
