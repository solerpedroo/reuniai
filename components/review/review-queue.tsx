"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  Check,
  CheckCircle,
  Clock,
  Copy,
  EnvelopeSimple,
  Sparkle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildFollowUpMailto } from "@/lib/meetings/follow-up-mailto";
import { FollowUpSendDialog } from "@/components/meetings/follow-up-send-dialog";
import type { ReviewQueueCounts, ReviewQueueItem } from "@/lib/review/review-queue";
import { ReviewExpressMode } from "@/components/review/review-express-mode";
import type { ActionItem } from "@/lib/supabase/types";
import type { MeetingFollowUp } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { formatMeetingDateTime } from "@/lib/meetings/types";

function formatRelativeDays(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

function CompactActionItems({
  meetingId,
  items,
  onChange,
}: {
  meetingId: string;
  items: ActionItem[];
  onChange: (items: ActionItem[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const suggested = items.filter((i) => i.status === "suggested");
  const active = items.filter((i) => i.status !== "suggested");
  const base = `/api/meetings/${meetingId}/action-items`;

  async function handleSuggestions(action: "accept" | "reject") {
    if (suggested.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch(`${base}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: suggested.map((i) => i.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao processar sugestões.");
        return;
      }
      if (action === "accept") {
        const accepted = (data.items ?? []) as ActionItem[];
        onChange(
          items.map((item) => accepted.find((a) => a.id === item.id) ?? item)
        );
      } else {
        const removed = (data.removedIds ?? suggested.map((i) => i.id)) as string[];
        onChange(items.filter((item) => !removed.includes(item.id)));
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: ActionItem) {
    const next = item.status === "done" ? "open" : "done";
    onChange(items.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
    const res = await fetch(`${base}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      onChange(items);
      toast.error("Não foi possível atualizar o item.");
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma atribuição nesta reunião.</p>;
  }

  return (
    <div className="space-y-3">
      {suggested.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSuggestions("accept")}>
            Aceitar {suggested.length} sugestão{suggested.length === 1 ? "" : "ões"}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => handleSuggestions("reject")}>
            Rejeitar sugestões
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {active.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => toggle(item)}
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={item.status === "done" ? "Reabrir item" : "Concluir item"}
            >
              {item.status === "done" ? (
                <CheckCircle size={18} weight="fill" className="text-emerald-600" />
              ) : (
                <CheckCircle size={18} />
              )}
            </button>
            <span
              className={cn(
                "text-sm",
                item.status === "done" && "text-muted-foreground line-through"
              )}
            >
              {item.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InlineFollowUp({
  meetingId,
  initialFollowUp,
  participantEmails,
  llmEnabled,
  onUpdate,
}: {
  meetingId: string;
  initialFollowUp: MeetingFollowUp | null;
  participantEmails: string[];
  llmEnabled: boolean;
  onUpdate: (followUp: MeetingFollowUp | null) => void;
}) {
  const [followUp, setFollowUp] = useState(initialFollowUp);
  const [subject, setSubject] = useState(initialFollowUp?.subject ?? "");
  const [body, setBody] = useState(initialFollowUp?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFollowUp(initialFollowUp);
    setSubject(initialFollowUp?.subject ?? "");
    setBody(initialFollowUp?.body ?? "");
  }, [initialFollowUp]);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/follow-up`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao gerar");
      setFollowUp(data.followUp);
      setSubject(data.followUp.subject);
      setBody(data.followUp.body);
      onUpdate(data.followUp);
      toast.success("Rascunho de follow-up gerado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar follow-up");
    } finally {
      setLoading(false);
    }
  }, [meetingId, onUpdate]);

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
      onUpdate(data.followUp);
      toast.success("Rascunho salvo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }, [meetingId, subject, body, onUpdate]);

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
    onUpdate(data.followUp);
    toast.success("Follow-up marcado como feito");
  }, [meetingId, onUpdate]);

  const copyAll = useCallback(async () => {
    await navigator.clipboard.writeText(`Assunto: ${subject}\n\n${body}`);
    setCopied(true);
    toast.success("Email copiado");
    setTimeout(() => setCopied(false), 2000);
  }, [subject, body]);

  const mailtoHref =
    subject && body
      ? buildFollowUpMailto({ subject, body, to: participantEmails })
      : undefined;

  return (
    <div className="space-y-3">
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
              Salvar
            </Button>
            <Button variant="outline" size="sm" onClick={copyAll} disabled={!subject || !body}>
              {copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
              Copiar
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
              onSent={(updated) => {
                setFollowUp(updated);
                onUpdate(updated);
              }}
            />
            {!followUp.follow_up_done_at && (
              <Button variant="ghost" size="sm" onClick={markDone}>
                Marcar follow-up feito
              </Button>
            )}
          </>
        )}
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

      {followUp ? (
        <div className="space-y-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto" />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {llmEnabled
            ? "Gere um rascunho de follow-up ou abra o detalhe da reunião."
            : "Configure um provedor de LLM para gerar follow-ups."}
        </p>
      )}
    </div>
  );
}

function ReviewQueueCard({
  item,
  expanded,
  onToggle,
  onRemove,
  llmEnabled,
}: {
  item: ReviewQueueItem;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  llmEnabled: boolean;
}) {
  const router = useRouter();
  const [actionItems, setActionItems] = useState(item.actionItems);
  const [followUp, setFollowUp] = useState(item.followUp);
  const [busy, setBusy] = useState(false);

  async function markReviewed() {
    setBusy(true);
    try {
      const res = await fetch(`/api/meetings/${item.id}/review`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao marcar como revisada");
        return;
      }
      toast.success("Reunião revisada");
      onRemove();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function snooze(preset: "tomorrow" | "in_3_days") {
    setBusy(true);
    try {
      const res = await fetch(`/api/meetings/${item.id}/review/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao adiar revisão");
        return;
      }
      toast.success("Revisão adiada");
      onRemove();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={cn(
        "surface-card overflow-hidden transition-colors",
        expanded && "border-brand/30"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-h-[44px] items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            {item.openActionItemsCount > 0 && (
              <Badge variant="outline">{item.openActionItemsCount} tarefa(s)</Badge>
            )}
            {item.suggestedActionItemsCount > 0 && (
              <Badge variant="secondary">{item.suggestedActionItemsCount} sugestão(ões)</Badge>
            )}
            {followUp && !followUp.follow_up_done_at && (
              <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
                Follow-up pendente
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatMeetingDateTime(item.started_at)} · {formatRelativeDays(item.started_at)}
          </p>
        </div>
        {expanded ? (
          <CaretUp size={18} className="shrink-0 text-muted-foreground" />
        ) : (
          <CaretDown size={18} className="shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-6 border-t px-4 pb-4 pt-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">Atribuições</h4>
            <CompactActionItems
              meetingId={item.id}
              items={actionItems}
              onChange={setActionItems}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Follow-up</h4>
            <InlineFollowUp
              meetingId={item.id}
              initialFollowUp={followUp}
              participantEmails={item.participantEmails}
              llmEnabled={llmEnabled}
              onUpdate={setFollowUp}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={markReviewed} disabled={busy}>
              <CheckCircle size={14} className="mr-1.5" />
              Marcar como revisada
            </Button>
            <Button size="sm" variant="outline" onClick={() => snooze("tomorrow")} disabled={busy}>
              <Clock size={14} className="mr-1.5" />
              Amanhã
            </Button>
            <Button size="sm" variant="outline" onClick={() => snooze("in_3_days")} disabled={busy}>
              Em 3 dias
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/reunioes/${item.id}?revisar=1`}>
                <ArrowSquareOut size={14} className="mr-1.5" />
                Abrir detalhe
              </Link>
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

export function ReviewQueue({
  initialItems,
  initialCounts,
  llmEnabled,
}: {
  initialItems: ReviewQueueItem[];
  initialCounts: ReviewQueueCounts;
  llmEnabled: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [counts, setCounts] = useState(initialCounts);
  const [expandedId, setExpandedId] = useState<string | null>(
    initialItems[0]?.id ?? null
  );
  const [focusIndex, setFocusIndex] = useState(0);
  const [expressMode, setExpressMode] = useState(false);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setCounts((prev) => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
    setExpandedId(null);
  }, []);

  const headerLabel = useMemo(() => {
    if (counts.pending === 0) return "Nenhuma reunião pendente";
    return `${counts.pending} reunião${counts.pending === 1 ? "" : "ões"} para revisar`;
  }, [counts.pending]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (items.length === 0) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === "j") {
        event.preventDefault();
        setFocusIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (event.key === "k") {
        event.preventDefault();
        setFocusIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const item = items[focusIndex];
        if (item) setExpandedId((id) => (id === item.id ? null : item.id));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items, focusIndex]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        tone="brand"
        title="Tudo revisado"
        description="Não há reuniões concluídas aguardando revisão no momento."
      >
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/reunioes">Ver reuniões</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/agenda">Ver agenda</Link>
          </Button>
        </div>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{headerLabel}</p>
          {counts.snoozed > 0 && (
            <Badge variant="secondary">{counts.snoozed} adiada(s)</Badge>
          )}
          {counts.reviewedToday > 0 && (
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400">
              {counts.reviewedToday} revisada(s) hoje
            </Badge>
          )}
        </div>
        <Button
          variant={expressMode ? "default" : "outline"}
          size="sm"
          className="md:hidden"
          onClick={() => setExpressMode((v) => !v)}
        >
          {expressMode ? "Lista" : "Express"}
        </Button>
      </div>

      {expressMode ? (
        <ReviewExpressMode items={items} />
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                focusIndex === index &&
                  "rounded-xl ring-2 ring-brand/30 ring-offset-2 ring-offset-background"
              )}
            >
              <ReviewQueueCard
                item={item}
                expanded={expandedId === item.id}
                onToggle={() =>
                  setExpandedId((id) => (id === item.id ? null : item.id))
                }
                onRemove={() => removeItem(item.id)}
                llmEnabled={llmEnabled}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
