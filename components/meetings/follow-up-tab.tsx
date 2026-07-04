"use client";

import { useCallback, useState } from "react";
import { Check, Copy, EnvelopeSimple, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildFollowUpMailto } from "@/lib/meetings/follow-up-mailto";
import { FollowUpSendDialog } from "@/components/meetings/follow-up-send-dialog";
import type { MeetingFollowUp } from "@/lib/workflow/types";
import { formatMeetingDateTime } from "@/lib/meetings/types";

export function FollowUpTab({
  meetingId,
  initialFollowUp,
  llmEnabled,
  participantEmails = [],
}: {
  meetingId: string;
  initialFollowUp: MeetingFollowUp | null;
  llmEnabled: boolean;
  participantEmails?: string[];
}) {
  const [followUp, setFollowUp] = useState(initialFollowUp);
  const [subject, setSubject] = useState(initialFollowUp?.subject ?? "");
  const [body, setBody] = useState(initialFollowUp?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/follow-up`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao gerar");
      setFollowUp(data.followUp);
      setSubject(data.followUp.subject);
      setBody(data.followUp.body);
      toast.success("Rascunho de follow-up gerado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar follow-up");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/follow-up`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setFollowUp(data.followUp);
      toast.success("Rascunho salvo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }, [meetingId, subject, body]);

  const markDone = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingId}/follow-up`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ follow_up_done: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Falha ao marcar follow-up");
      return;
    }
    setFollowUp(data.followUp);
    toast.success("Follow-up marcado como feito");
  }, [meetingId]);

  const copyAll = useCallback(async () => {
    const text = `Assunto: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Email copiado");
    setTimeout(() => setCopied(false), 2000);
  }, [subject, body]);

  const mailtoHref =
    subject && body
      ? buildFollowUpMailto({ subject, body, to: participantEmails })
      : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Follow-up por email</h3>
          <p className="text-sm text-muted-foreground">
            Rascunho gerado por IA para enviar aos participantes. Edite antes de copiar ou abrir no
            seu cliente de email.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {llmEnabled && (
            <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
              <Sparkle size={14} className="mr-1.5" />
              {followUp ? "Regenerar" : "Gerar rascunho"}
            </Button>
          )}
          {followUp && (
            <>
              <Button variant="outline" size="sm" onClick={save} disabled={saving}>
                Salvar edições
              </Button>
              <Button size="sm" onClick={copyAll} disabled={!subject || !body}>
                {copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                Copiar email
              </Button>
              {mailtoHref && (
                <Button variant="outline" size="sm" asChild>
                  <a href={mailtoHref}>
                    <EnvelopeSimple size={14} className="mr-1.5" />
                    Abrir no email
                  </a>
                </Button>
              )}
              <FollowUpSendDialog
                meetingId={meetingId}
                subject={subject}
                body={body}
                participantEmails={participantEmails}
                disabled={!subject || !body}
                onSent={(updated) => setFollowUp(updated)}
              />
              {!followUp.follow_up_done_at && (
                <Button variant="ghost" size="sm" onClick={markDone}>
                  Marcar follow-up feito
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {followUp?.sent_at && (
        <Badge variant="outline" className="gap-1">
          <EnvelopeSimple size={12} />
          Enviado em {formatMeetingDateTime(followUp.sent_at)}
        </Badge>
      )}

      {followUp?.follow_up_done_at && (
        <Badge variant="secondary" className="gap-1">
          <Check size={12} />
          Follow-up feito
        </Badge>
      )}

      {!followUp ? (
        <div className="surface-card flex flex-col items-center justify-center gap-3 p-10 text-center">
          <EnvelopeSimple size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {llmEnabled
              ? "Gere um rascunho de follow-up com base no resumo e nas atribuições."
              : "Configure um provedor de LLM para gerar follow-ups automaticamente."}
          </p>
        </div>
      ) : (
        <div className="surface-card space-y-4 p-4">
          <div className="space-y-2">
            <label htmlFor="follow-up-subject" className="text-sm font-medium">
              Assunto
            </label>
            <Input
              id="follow-up-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="follow-up-body" className="text-sm font-medium">
              Corpo
            </label>
            <Textarea
              id="follow-up-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="font-mono text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
