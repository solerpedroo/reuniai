"use client";

import { useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  meetingId: string;
  defaultRecipients?: string[];
};

export function DistributeDialog({ meetingId, defaultRecipients = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [emailsText, setEmailsText] = useState(defaultRecipients.join(", "));
  const [includeShareLink, setIncludeShareLink] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const recipients = emailsText
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      toast.error("Informe ao menos um email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/distribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, includeShareLink }),
      });
      const data = (await res.json()) as { error?: string; sent?: number };

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao enviar.");
        return;
      }

      toast.success(`Resumo enviado para ${data.sent} participante(s).`);
      setOpen(false);
    } catch {
      toast.error("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <PaperPlaneTilt className="size-4" />
          Distribuir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar resumo aos participantes</DialogTitle>
          <DialogDescription>
            Cada destinatário recebe o resumo executivo, encaminhamentos relevantes e link read-only
            opcional.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="distribute-emails">Emails (separados por vírgula)</Label>
            <Input
              id="distribute-emails"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder="ana@empresa.com, bob@empresa.com"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="distribute-share">Incluir link read-only</Label>
            <Switch
              id="distribute-share"
              checked={includeShareLink}
              onCheckedChange={setIncludeShareLink}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={loading}>
            {loading ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
