"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FOLLOW_UP_STATUS_FILTERS,
  type FollowUpsHub,
  type FollowUpStatus,
} from "@/lib/follow-ups/hub-types";
import { formatMeetingDateTime } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<FollowUpStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  done: "Concluído",
};

export function FollowUpsHubView({
  hub,
  activeFilter,
}: {
  hub: FollowUpsHub;
  activeFilter: FollowUpStatus | "pendente" | "all";
}) {
  const router = useRouter();

  const markDone = useCallback(
    async (meetingId: string) => {
      const res = await fetch(`/api/meetings/${meetingId}/follow-up`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follow_up_done: true }),
      });
      if (!res.ok) {
        toast.error("Não foi possível marcar como concluído");
        return;
      }
      toast.success("Follow-up concluído");
      router.refresh();
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-semibold tabular-nums">{hub.pendingCount}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Enviados esta semana</p>
          <p className="text-2xl font-semibold tabular-nums">{hub.sentThisWeekCount}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Concluídos</p>
          <p className="text-2xl font-semibold tabular-nums">{hub.doneCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FOLLOW_UP_STATUS_FILTERS.map((option) => (
          <Button
            key={option.value}
            variant={activeFilter === option.value ? "brand" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/follow-ups?status=${option.value}`}>{option.label}</Link>
          </Button>
        ))}
        <Button variant={activeFilter === "all" ? "brand" : "outline"} size="sm" asChild>
          <Link href="/follow-ups?status=all">Todos</Link>
        </Button>
      </div>

      {hub.items.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
          <EnvelopeSimple size={32} className="text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Nenhum follow-up neste filtro</p>
          <p className="text-sm text-muted-foreground">
            Gere rascunhos na aba Follow-up de uma reunião revisada.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/revisar">Ir para revisar</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {hub.items.map((item) => (
            <li key={item.meetingId} className="surface-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/reunioes/${item.meetingId}?tab=followup`}
                    className="font-medium hover:text-brand"
                  >
                    {item.subject}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {item.bodyPreview}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.meetingTitle} · {formatMeetingDateTime(item.meetingStartedAt)}
                  </p>
                  <span
                    className={cn(
                      "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                      item.status === "done"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : item.status === "sent"
                          ? "bg-brand/10 text-brand"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/reunioes/${item.meetingId}?tab=followup`}>Abrir</Link>
                  </Button>
                  {item.status !== "done" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void markDone(item.meetingId)}
                    >
                      Concluir
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
