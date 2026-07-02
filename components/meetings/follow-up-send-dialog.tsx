"use client";

import { useMemo, useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MeetingFollowUp } from "@/lib/workflow/types";

export function FollowUpSendDialog({
  meetingId,
  subject,
  body,
  participantEmails,
  disabled,
  onSent,
}: {
  meetingId: string;
  subject: string;
  body: string;
  participantEmails: string[];
  disabled?: boolean;
  onSent: (followUp: MeetingFollowUp) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [manualEmail, setManualEmail] = useState("");

  const uniqueEmails = useMemo(() => {
    const seen = new Set<string>();
    return participantEmails
      .map((email) => email.trim().toLowerCase())
      .filter((email) => {
        if (!email || !email.includes("@") || seen.has(email)) return false;
        seen.add(email);
        return true;
      });
  }, [participantEmails]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(uniqueEmails));

  const toggleEmail = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const addManualEmail = () => {
    const email = manualEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      toast.error("Email inválido");
      return;
    }
    setSelected((prev) => new Set(prev).add(email));
    setManualEmail("");
  };

  const send = async () => {
    const recipients = [...selected];
    if (recipients.length === 0) {
      toast.error("Selecione ao menos um destinatário");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/follow-up/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipients, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao enviar");
      onSent(data.followUp);
      setOpen(false);
      toast.success("Follow-up enviado por email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar follow-up");
    } finally {
      setSending(false);
    }
  };

  const allOptions = useMemo(() => {
    const seen = new Set(uniqueEmails);
    const options = [...uniqueEmails];
    for (const email of selected) {
      if (!seen.has(email)) options.push(email);
    }
    return options;
  }, [uniqueEmails, selected]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled || !subject || !body}>
          <PaperPlaneTilt size={14} className="mr-1.5" />
          Enviar por email
        </Button>
      </DialogTrigger>
      <DialogContent className="surface-modal sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar follow-up</DialogTitle>
          <DialogDescription>
            Confirme os destinatários antes de enviar via Resend. Requer RESEND_API_KEY
            configurada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Destinatários</Label>
            {allOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum email de participante. Adicione manualmente abaixo.
              </p>
            ) : (
              <ul className="space-y-2">
                {allOptions.map((email) => (
                  <li key={email} className="flex items-center gap-2">
                    <Checkbox
                      id={`recipient-${email}`}
                      checked={selected.has(email)}
                      onCheckedChange={() => toggleEmail(email)}
                    />
                    <label htmlFor={`recipient-${email}`} className="text-sm">
                      {email}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Outro email…"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManualEmail();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addManualEmail}>
              Adicionar
            </Button>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Assunto</p>
            <p className="truncate">{subject}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending ? "Enviando…" : "Confirmar envio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
