"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, LinkSimple, ShieldCheck, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_SHARE_PERMISSIONS,
  formatSharePermissionsSummaryFriendly,
  hasShareableContent,
  normalizeSharePermissions,
  SHARE_PERMISSION_FIELDS,
  SHARE_PERMISSION_PRESETS,
  SHARE_PERMISSION_SIMPLE_LABELS,
  type SharePermissions,
} from "@/lib/meetings/share-permissions";
import { cn } from "@/lib/utils";

type ShareTokenRow = {
  id: string;
  token: string;
  permissions: SharePermissions;
  expires_at: string;
  created_at: string;
};

const EXPIRY_OPTIONS = [
  { value: "1", label: "1 dia" },
  { value: "7", label: "1 semana" },
  { value: "14", label: "2 semanas" },
  { value: "30", label: "1 mês" },
] as const;

type PresetKey = keyof typeof SHARE_PERMISSION_PRESETS;

const PRESET_SHORT_LABELS: Record<PresetKey, string> = {
  minimal: "Essencial",
  standard: "Completo",
  full: "Transcrição",
};

const PERMISSION_GROUPS: {
  title: string;
  keys: (keyof SharePermissions)[];
}[] = [
  {
    title: "Conteúdo da reunião",
    keys: ["executive_summary", "topics", "decisions", "action_items"],
  },
  {
    title: "Pessoas e fala",
    keys: ["participants", "talk_time", "transcript"],
  },
];

function permissionsMatchPreset(
  permissions: SharePermissions,
  preset: SharePermissions
): boolean {
  return SHARE_PERMISSION_FIELDS.every(({ key }) => permissions[key] === preset[key]);
}

function countSelected(permissions: SharePermissions): number {
  return SHARE_PERMISSION_FIELDS.filter(({ key }) => permissions[key]).length;
}

export function ShareLinkDialog({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState<SharePermissions>({
    ...DEFAULT_SHARE_PERMISSIONS,
  });
  const [days, setDays] = useState("7");
  const [redactPii, setRedactPii] = useState(true);
  const [tokens, setTokens] = useState<ShareTokenRow[]>([]);
  const [loading, setLoading] = useState(false);

  const activePreset = useMemo((): PresetKey | null => {
    for (const [key, preset] of Object.entries(SHARE_PERMISSION_PRESETS) as [
      PresetKey,
      (typeof SHARE_PERMISSION_PRESETS)[PresetKey],
    ][]) {
      if (permissionsMatchPreset(permissions, preset.permissions)) return key;
    }
    return null;
  }, [permissions]);

  const selectedCount = useMemo(() => countSelected(permissions), [permissions]);

  const loadTokens = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingId}/share`);
    const data = await res.json();
    if (res.ok) setTokens(data.tokens ?? []);
  }, [meetingId]);

  const setPermission = useCallback((key: keyof SharePermissions, checked: boolean) => {
    setPermissions((current) =>
      normalizeSharePermissions({
        ...current,
        [key]: checked,
      })
    );
  }, []);

  const applyPreset = useCallback((preset: PresetKey) => {
    setPermissions({ ...SHARE_PERMISSION_PRESETS[preset].permissions });
  }, []);

  const createLink = useCallback(async () => {
    const normalized = normalizeSharePermissions(permissions);
    if (!hasShareableContent(normalized)) {
      toast.error("Marque pelo menos um item para compartilhar");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: normalized,
          days: Number.parseInt(days, 10),
          redact_pii: redactPii,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar link");
      await navigator.clipboard.writeText(data.url);
      toast.success("Link copiado! Cole no WhatsApp, e-mail ou mensagem.");
      await loadTokens();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o link");
    } finally {
      setLoading(false);
    }
  }, [meetingId, permissions, days, redactPii, loadTokens]);

  const revoke = useCallback(
    async (tokenId: string) => {
      const res = await fetch(`/api/meetings/${meetingId}/share?tokenId=${tokenId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Não foi possível remover o link");
        return;
      }
      toast.success("Link removido");
      await loadTokens();
    },
    [meetingId, loadTokens]
  );

  const copyUrl = useCallback(async (token: string) => {
    const appUrl = window.location.origin;
    await navigator.clipboard.writeText(`${appUrl}/s/${token}`);
    toast.success("Link copiado");
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void loadTokens();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkSimple size={14} className="mr-1.5" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(85dvh,580px)] flex-col gap-0 overflow-hidden border-brand/15 p-0 sm:max-w-[500px]">
        <div className="shrink-0 border-b border-border/70 px-6 pb-4 pt-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle>Compartilhar esta reunião</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Crie um link para WhatsApp ou e-mail. Quem receber{" "}
              <span className="font-medium text-foreground">não precisa de conta</span> para ver o
              que você marcar abaixo.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="label-caps">Atalhos</p>
              {activePreset === "standard" && (
                <Badge variant="secondary" className="text-[10px]">
                  Recomendado
                </Badge>
              )}
              {activePreset === null && (
                <Badge variant="outline" className="text-[10px]">
                  Personalizado
                </Badge>
              )}
            </div>
            <div className="inline-flex h-9 w-full rounded-lg bg-muted p-1">
              {(Object.entries(SHARE_PERMISSION_PRESETS) as [
                PresetKey,
                (typeof SHARE_PERMISSION_PRESETS)[PresetKey],
              ][]).map(([key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={cn(
                    "flex-1 rounded-md text-sm font-medium transition-all",
                    activePreset === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {PRESET_SHORT_LABELS[key]}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {activePreset
                ? SHARE_PERMISSION_PRESETS[activePreset].friendlySubtitle
                : "Ajuste os itens abaixo ou escolha um atalho pronto."}
            </p>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="label-caps">Itens no link</p>
              <span className="text-xs text-muted-foreground">
                {selectedCount} de {SHARE_PERMISSION_FIELDS.length}
              </span>
            </div>

            <div className="surface-card divide-y divide-border/60 overflow-hidden">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="bg-muted/15 px-4 py-2">
                    <p className="text-xs font-medium text-muted-foreground">{group.title}</p>
                  </div>
                  <ul className="divide-y divide-border/50">
                    {group.keys.map((key) => {
                      const field = SHARE_PERMISSION_FIELDS.find((item) => item.key === key);
                      if (!field) return null;

                      const disabled = field.requiresTranscript && !permissions.transcript;
                      const checked = permissions[key];

                      return (
                        <li key={key}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors",
                              disabled
                                ? "cursor-not-allowed opacity-50"
                                : "hover:bg-muted/20",
                              checked && !disabled && "bg-brand/[0.04]"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(value) => setPermission(key, value === true)}
                              className="mt-0.5"
                            />
                            <span className="min-w-0 space-y-0.5">
                              <span className="block text-sm font-medium leading-snug">
                                {SHARE_PERMISSION_SIMPLE_LABELS[key]}
                              </span>
                              {disabled && (
                                <span className="block text-xs text-muted-foreground">
                                  Marque a transcrição para incluir esta opção.
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Chat com IA, gravação e exportações ficam disponíveis só para quem tem conta.
            </p>
          </section>

          <section className="space-y-2.5">
            <p className="label-caps">Configurações</p>
            <div className="surface-card space-y-3 p-4">
              <div className="space-y-2">
                <Label htmlFor="share-expiry">Validade do link</Label>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger id="share-expiry" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                        {option.value === "7" ? " · recomendado" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-3 transition-colors hover:bg-muted/35">
                <span className="flex min-w-0 items-start gap-2.5">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">Esconder dados pessoais</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      Nomes, e-mails e telefones ficam ocultos no link.
                    </span>
                  </span>
                </span>
                <Switch checked={redactPii} onCheckedChange={setRedactPii} />
              </label>
            </div>
          </section>

          {tokens.length > 0 && (
            <section className="space-y-2">
              <p className="label-caps">Links ativos</p>
              <ul className="space-y-2">
                {tokens.map((token) => (
                  <li
                    key={token.id}
                    className="surface-card flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {formatSharePermissionsSummaryFriendly(token.permissions)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Válido até{" "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(token.expires_at))}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Copiar link"
                        onClick={() => copyUrl(token.token)}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Remover link"
                        onClick={() => revoke(token.id)}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/70 bg-muted/15 px-6 py-4">
          <Button
            onClick={createLink}
            disabled={loading || !hasShareableContent(permissions)}
            className="w-full sm:w-auto"
            variant="brand"
          >
            <LinkSimple size={16} className="mr-1.5" />
            Copiar link para compartilhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
