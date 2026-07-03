"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Clock } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewQueueItem } from "@/lib/review/review-queue";

type Props = {
  items: ReviewQueueItem[];
};

export function ReviewExpressMode({ items }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const item = items[index];

  if (!item) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Fila expressa vazia — você está em dia.
        </CardContent>
      </Card>
    );
  }

  async function markReviewed() {
    setBusy(true);
    try {
      const res = await fetch(`/api/meetings/${item.id}/review`, { method: "POST" });
      if (!res.ok) {
        toast.error("Não foi possível marcar como revisada.");
        return;
      }
      toast.success("Revisada!");
      if (index >= items.length - 1) {
        router.refresh();
        setIndex(0);
      } else {
        setIndex((i) => i + 1);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function snooze() {
    setBusy(true);
    try {
      const res = await fetch(`/api/meetings/${item.id}/review/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: "tomorrow" }),
      });
      if (!res.ok) {
        toast.error("Falha ao adiar.");
        return;
      }
      toast.success("Adiada para amanhã.");
      setIndex((i) => Math.min(i + 1, items.length - 1));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg touch-pan-y">
      <CardHeader>
        <CardTitle className="text-lg">{item.title}</CardTitle>
        <CardDescription>
          {index + 1} de {items.length} · express
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.actionItems.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {item.openActionItemsCount} tarefa(s) aberta(s)
            {item.suggestedActionItemsCount > 0 &&
              ` · ${item.suggestedActionItemsCount} sugestão(ões)`}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="h-14"
            onClick={() => void markReviewed()}
            disabled={busy}
          >
            <CheckCircle className="size-5" weight="fill" />
            Revisada
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-14"
            onClick={() => void snooze()}
            disabled={busy}
          >
            <Clock className="size-5" />
            Depois
          </Button>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <button type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ArrowLeft className="inline size-4" /> Anterior
          </button>
          <button
            type="button"
            disabled={index >= items.length - 1}
            onClick={() => setIndex((i) => i + 1)}
          >
            Próxima <ArrowRight className="inline size-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
