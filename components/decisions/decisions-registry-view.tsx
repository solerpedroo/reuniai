"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Gavel, MagnifyingGlass, TrendUp } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DECISION_PERIODS,
  type DecisionPeriod,
  type DecisionRegistry,
} from "@/lib/decisions/registry-types";
import { formatMeetingDate } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

function weekLabel(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(iso));
}

export function DecisionsRegistryView({ registry }: { registry: DecisionRegistry }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

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

  function setPeriod(period: DecisionPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
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
            onClick={() => setPeriod(option.value)}
            className={cn(registry.period === option.value && "bg-brand hover:bg-brand/90")}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Decisões registradas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{registry.totalDecisions}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Reuniões com decisão</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {registry.meetingsWithDecisions}
          </p>
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
                {items.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/reunioes/${entry.meetingId}`}
                      className="surface-card block p-4 transition-colors hover:border-brand/30"
                    >
                      <p className="text-sm leading-relaxed">{entry.text}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{entry.meetingTitle}</span>
                        <span>·</span>
                        <span>{formatMeetingDate(entry.meetingStartedAt)}</span>
                        {entry.occurrenceCount > 1 && (
                          <span className="inline-flex items-center gap-1 text-brand">
                            <TrendUp size={12} aria-hidden />
                            {entry.occurrenceCount}× no período
                          </span>
                        )}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
