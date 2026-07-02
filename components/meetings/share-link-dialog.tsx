"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, Globe, LinkSimple, ShieldCheck, Sparkle, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  formatSharePermissionsSummary,
  hasShareableContent,
  normalizeSharePermissions,
  SHARE_PERMISSION_FIELDS,
  SHARE_PERMISSION_PRESETS,
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
  { value: "7", label: "7 dias" },
  { value: "14", label: "14 dias" },
  { value: "30", label: "30 dias" },
] as const;

type PresetKey = keyof typeof SHARE_PERMISSION_PRESETS;

function permissionsMatchPreset(
  permissions: SharePermissions,
  preset: SharePermissions
): boolean {
  return SHARE_PERMISSION_FIELDS.every(({ key }) => permissions[key] === preset[key]);
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
      toast.error("Selecione ao menos um conteúdo para compartilhar");
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
      toast.success("Link público copiado para a área de transferência");
      await loadTokens();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar link");
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
        toast.error("Falha ao revogar link");
        return;
      }
      toast.success("Link revogado");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link público de compartilhamento</DialogTitle>
          <DialogDescription>
            Escolha exatamente o que quem receber o link poderá ver. Recursos de IA continuam
            disponíveis apenas para quem criar conta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <Globe size={18} className="mt-0.5 shrink-0 text-brand" />
            <p className="text-xs text-muted-foreground">
              O link é público e não exige login. Chat com IA, gravação, busca semântica e
              exportações avançadas ficam reservados para usuários cadastrados.
            </p>
          </div>

          <section className="space-y-3">
            <div>
              <p className="text-sm font-medium">O que incluir no link</p>
              <p className="text-xs text-muted-foreground">
                Use um atalho ou marque seção por seção
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.entries(SHARE_PERMISSION_PRESETS) as [
                PresetKey,
                (typeof SHARE_PERMISSION_PRESETS)[PresetKey],
              ][]).map(([key, preset]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={activePreset === key ? "default" : "outline"}
                  className="h-8"
                  onClick={() => applyPreset(key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <ul className="space-y-2 rounded-lg border border-border/60 p-3">
              {SHARE_PERMISSION_FIELDS.map(({ key, label, description, requiresTranscript }) => {
                const disabled = requiresTranscript && !permissions.transcript;
                const checked = permissions[key];

                return (
                  <li key={key}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md px-1 py-1.5 transition-colors",
                        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-muted/40"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(value) => setPermission(key, value === true)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight">{label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {description}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Validade do link</p>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={createLink}
            disabled={loading || !hasShareableContent(permissions)}
            className="w-full"
          >
            Gerar link público
          </Button>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
            <div className="flex items-start gap-2">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" />
              <div>
                <p className="text-sm font-medium">Redigir dados sensíveis</p>
                <p className="text-xs text-muted-foreground">
                  Recomendado para links públicos (padrão ativo)
                </p>
              </div>
            </div>
            <Switch checked={redactPii} onCheckedChange={setRedactPii} />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-brand/20 bg-brand/5 px-3 py-2">
            <Sparkle size={18} className="mt-0.5 shrink-0 text-brand" />
            <p className="text-xs text-muted-foreground">
              Quem abrir o link verá um convite para criar conta e usar IA — chat, follow-up e
              busca inteligente não são liberados no link público.
            </p>
          </div>

          {tokens.length > 0 && (
            <ul className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Links ativos</p>
              {tokens.map((token) => (
                <li
                  key={token.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {formatSharePermissionsSummary(token.permissions)} · Público
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expira{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(token.expires_at))}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyUrl(token.token)}>
                      <Copy size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => revoke(token.id)}>
                      <Trash size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
