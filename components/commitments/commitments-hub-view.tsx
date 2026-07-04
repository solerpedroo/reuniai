"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Handshake } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  COMMITMENT_STATUS_FILTERS,
  DIRECTION_LABELS,
  type CommitmentsHub,
  type VerbalCommitmentStatus,
} from "@/lib/commitments/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<VerbalCommitmentStatus, string> = {
  pending: "Pendente",
  fulfilled: "Cumprido",
  overdue: "Atrasado",
  disputed: "Disputado",
};

export function CommitmentsHubView({
  hub,
  activeFilter,
}: {
  hub: CommitmentsHub;
  activeFilter: VerbalCommitmentStatus | "all";
}) {
  const router = useRouter();

  const updateStatus = useCallback(
    async (id: string, status: VerbalCommitmentStatus) => {
      const res = await fetch(`/api/commitments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error("Não foi possível atualizar o compromisso");
        return;
      }
      toast.success("Status atualizado");
      router.refresh();
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-semibold tabular-nums">{hub.counts.pending}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Atrasados</p>
          <p className="text-2xl font-semibold tabular-nums text-destructive">{hub.counts.overdue}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Cumpridos</p>
          <p className="text-2xl font-semibold tabular-nums">{hub.counts.fulfilled}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold tabular-nums">{hub.counts.all}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {COMMITMENT_STATUS_FILTERS.map((option) => (
          <Button
            key={option.value}
            variant={activeFilter === option.value ? "brand" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/compromissos?status=${option.value}`}>{option.label}</Link>
          </Button>
        ))}
        <Button variant={activeFilter === "all" ? "brand" : "outline"} size="sm" asChild>
          <Link href="/compromissos?status=all">Todos</Link>
        </Button>
      </div>

      {hub.items.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
          <Handshake size={32} className="text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Nenhum compromisso verbal neste filtro. Eles aparecem após o processamento das reuniões.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {hub.items.map((item) => (
            <li key={item.id} className="surface-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{item.text}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{DIRECTION_LABELS[item.direction]}</span>
                    {item.counterparty && <span>· {item.counterparty}</span>}
                    {item.due_date && <span>· Prazo: {item.due_date}</span>}
                    {item.meetingTitle && (
                      <Link
                        href={`/reunioes/${item.meeting_id}`}
                        className="text-brand hover:underline"
                      >
                        · {item.meetingTitle}
                      </Link>
                    )}
                  </div>
                  {item.source_quote && (
                    <p className="text-xs italic text-muted-foreground">&ldquo;{item.source_quote}&rdquo;</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      item.status === "overdue" && "bg-destructive/10 text-destructive",
                      item.status === "fulfilled" && "bg-emerald-500/10 text-emerald-700",
                      item.status === "pending" && "bg-muted text-muted-foreground",
                      item.status === "disputed" && "bg-amber-500/10 text-amber-700"
                    )}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                  {item.status !== "fulfilled" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "fulfilled")}>
                      Marcar cumprido
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
