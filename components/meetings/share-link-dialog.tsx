"use client";

import { useCallback, useState } from "react";
import { Copy, LinkSimple, ShieldCheck, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { ShareScope } from "@/lib/workflow/types";

type ShareTokenRow = {
  id: string;
  token: string;
  scope: ShareScope;
  expires_at: string;
  created_at: string;
};

export function ShareLinkDialog({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ShareScope>("summary_only");
  const [redactPii, setRedactPii] = useState(true);
  const [tokens, setTokens] = useState<ShareTokenRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTokens = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingId}/share`);
    const data = await res.json();
    if (res.ok) setTokens(data.tokens ?? []);
  }, [meetingId]);

  const createLink = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, days: 7, redact_pii: redactPii }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar link");
      await navigator.clipboard.writeText(data.url);
      toast.success("Link copiado para a área de transferência");
      await loadTokens();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar link");
    } finally {
      setLoading(false);
    }
  }, [meetingId, scope, redactPii, loadTokens]);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link de compartilhamento</DialogTitle>
          <DialogDescription>
            Crie um link read-only válido por 7 dias. Revogue a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={scope} onValueChange={(v) => setScope(v as ShareScope)}>
              <SelectTrigger className="sm:flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary_only">Apenas resumo e atribuições</SelectItem>
                <SelectItem value="full_transcript">Resumo + transcrição completa</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={createLink} disabled={loading}>
              Gerar link
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
            <div className="flex items-start gap-2">
              <ShieldCheck size={18} className="mt-0.5 text-brand shrink-0" />
              <div>
                <p className="text-sm font-medium">Redigir dados sensíveis</p>
                <p className="text-xs text-muted-foreground">
                  Recomendado para links públicos (default ativo)
                </p>
              </div>
            </div>
            <Switch checked={redactPii} onCheckedChange={setRedactPii} />
          </div>

          {tokens.length > 0 && (
            <ul className="space-y-2">
              {tokens.map((token) => (
                <li
                  key={token.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {token.scope === "full_transcript" ? "Completo" : "Resumo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expira {new Intl.DateTimeFormat("pt-BR").format(new Date(token.expires_at))}
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
