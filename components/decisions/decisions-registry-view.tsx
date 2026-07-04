"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretDown, CaretUp, Gavel, MagnifyingGlass, TrendUp } from "@phosphor-icons/react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DECISION_OUTCOME_STATUSES,
  DECISION_OUTCOME_STATUS_LABELS,
  type DecisionOutcomeStatus,
} from "@/lib/decisions/outcome-types";
import {
  DECISION_PERIODS,
  type DecisionRegistry,
} from "@/lib/decisions/registry-types";
import { formatMeetingDateTime } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

function weekLabel(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(iso));
}

function statusBadgeClass(status: DecisionOutcomeStatus): string {
  switch (status) {
    case "done":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
    case "in_progress":
      return "bg-blue-500/15 text-blue-800 dark:text-blue-200";
    case "reversed":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-100";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function DecisionsRegistryView({
  registry,
  statusFilter,
}: {
  registry: DecisionRegistry;
  statusFilter: DecisionOutcomeStatus | "all";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registry.entries;
    return registry.entries.filter((entry) => entry.text.toLowerCase().includes(q));
  }, [query, registry.entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const entry of filtered) {
      const key = weekLabel(entry.meetingStartedAt);
      const group = map.get(key) ?? [];
      group.push(entry);
      map.set(key, group);
    }
    return [...map.entries()];
  }, [filtered]);

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function patchStatus(decisionKey: string, status: DecisionOutcomeStatus) {
    setBusyKey(decisionKey);
    try {
      const res = await fetch(`/api/decisions/outcomes/${encodeURIComponent(decisionKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao salvar");
      }
      toast.success("Status atualizado");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusyKey(null);
    }
  }

  async function respondSuggestion(decisionKey: string, action: "accept" | "reject") {
    setBusyKey(decisionKey);
    try {
      const res = await fetch(
        `/api/decisions/outcomes/${encodeURIComponent(decisionKey)}/suggestion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao responder");
      }
      toast.success(action === "accept" ? "Sugestão aceita" : "Sugestão descartada");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao responder");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {DECISION_PERIODS.map((option) => (
          <Button
            key={option.value}
            variant={registry.period === option.value ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => updateParams({ period: option.value })}
            className={cn(registry.period === option.value && "bg-brand hover:bg-brand/90")}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => updateParams({ status: undefined })}
        >
          Todas
        </Button>
        {DECISION_OUTCOME_STATUSES.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={statusFilter === option.value ? "default" : "outline"}
            onClick={() => updateParams({ status: option.value })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Decisões únicas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{registry.totalDecisions}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Taxa de cumprimento</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {registry.completionRate != null ? `${registry.completionRate}%` : "—"}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Stale (&gt;30 dias)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{registry.staleCount}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Mais recorrente</p>
          <p className="mt-1 line-clamp-2 text-sm font-medium">
            {registry.topRecurring ?? "—"}
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar decisões…"
          className="pl-9"
        />
      </div>

      {registry.entries.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="Nenhuma decisão no período"
          description="Decisões aparecem nos resumos IA das reuniões processadas."
        >
          <Button asChild variant="outline">
            <Link href="/reunioes">Ver reuniões</Link>
          </Button>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum resultado para &quot;{query}&quot;.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([week, items]) => (
            <section key={week}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {week}
              </h2>
              <ul className="space-y-2">
                {items.map((entry) => {
                  const expanded = expandedKey === entry.decisionKey;
                  return (
                    <li key={entry.id} className="surface-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-relaxed">{entry.text}</p>
                          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Link href={`/reunioes/${entry.meetingId}`} className="hover:text-brand">
                              {entry.meetingTitle}
                            </Link>
                            <span>·</span>
                            <span>{formatMeetingDateTime(entry.meetingStartedAt)}</span>
                            {entry.occurrenceCount > 1 && (
                              <span className="inline-flex items-center gap-1 text-brand">
                                <TrendUp size={12} aria-hidden />
                                {entry.occurrenceCount}× no período
                              </span>
                            )}
                            {entry.staleDays > 30 && entry.status === "pending" && (
                              <span className="text-amber-600">Stale {entry.staleDays}d</span>
                            )}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            statusBadgeClass(entry.status)
                          )}
                        >
                          {DECISION_OUTCOME_STATUS_LABELS[entry.status]}
                        </span>
                      </div>

                      {entry.suggestedStatus ? (
                        <div className="mt-3 rounded-md border border-brand/30 bg-brand/5 p-3 text-sm">
                          <p>
                            IA sugere:{" "}
                            <strong>
                              {DECISION_OUTCOME_STATUS_LABELS[entry.suggestedStatus]}
                            </strong>
                          </p>
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              disabled={busyKey === entry.decisionKey}
                              onClick={() =>
                                void respondSuggestion(entry.decisionKey, "accept")
                              }
                            >
                              Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyKey === entry.decisionKey}
                              onClick={() =>
                                void respondSuggestion(entry.decisionKey, "reject")
                              }
                            >
                              Ignorar
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value={entry.status}
                          disabled={busyKey === entry.decisionKey}
                          onChange={(e) =>
                            void patchStatus(
                              entry.decisionKey,
                              e.target.value as DecisionOutcomeStatus
                            )
                          }
                        >
                          {DECISION_OUTCOME_STATUSES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setExpandedKey(expanded ? null : entry.decisionKey)
                          }
                        >
                          Timeline
                          {expanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                        </Button>
                      </div>

                      {expanded ? (
                        <ol className="mt-3 space-y-2 border-l border-border pl-3 text-xs text-muted-foreground">
                          {entry.timeline.map((item) => (
                            <li key={`${entry.decisionKey}-${item.meetingId}`}>
                              <Link
                                href={`/reunioes/${item.meetingId}`}
                                className="hover:text-brand"
                              >
                                {item.meetingTitle}
                              </Link>{" "}
                              · {formatMeetingDateTime(item.meetingStartedAt)}
                            </li>
                          ))}
                        </ol>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
