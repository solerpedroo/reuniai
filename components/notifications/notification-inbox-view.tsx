"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CalendarBlank,
  Check,
  CheckSquare,
  Trash,
  VideoCamera,
  Warning,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatNotificationTimestamp } from "@/lib/notifications/format-relative-time";
import type { NotificationInboxTab } from "@/lib/notifications/inbox";
import type { NotificationKind } from "@/lib/notifications/kinds";
import type { AppNotification } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

const TABS: { id: NotificationInboxTab; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "meetings", label: "Reuniões" },
  { id: "tasks", label: "Tarefas" },
  { id: "prep", label: "Prep" },
  { id: "system", label: "Sistema" },
];

const KIND_ICONS: Record<NotificationKind, typeof Bell> = {
  prep: CalendarBlank,
  completed: VideoCamera,
  bot_failed: Warning,
  tasks_due: CheckSquare,
};

function dayGroupLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, now)) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(date, yesterday)) return "Ontem";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(date);
}

function groupByDay(notifications: AppNotification[]): [string, AppNotification[]][] {
  const map = new Map<string, AppNotification[]>();
  for (const notification of notifications) {
    const key = dayGroupLabel(notification.created_at);
    const group = map.get(key) ?? [];
    group.push(notification);
    map.set(key, group);
  }
  return [...map.entries()];
}

export type NotificationInboxInitial = {
  notifications: AppNotification[];
  unreadCount: number;
  tabCounts: Record<NotificationInboxTab, number>;
};

export function NotificationInboxView({
  initial,
  initialTab,
  unreadOnly: initialUnreadOnly,
}: {
  initial: NotificationInboxInitial;
  initialTab: NotificationInboxTab;
  unreadOnly: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState(initial.notifications);
  const [unreadCount, setUnreadCount] = useState(initial.unreadCount);
  const [tabCounts, setTabCounts] = useState(initial.tabCounts);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const tab = initialTab;
  const unreadOnly = initialUnreadOnly;

  const grouped = useMemo(() => groupByDay(notifications), [notifications]);
  const selectedIds = useMemo(() => [...selected], [selected]);

  const updateUrl = useCallback(
    (nextTab: NotificationInboxTab, nextUnreadOnly: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "all") params.delete("tab");
      else params.set("tab", nextTab);
      if (nextUnreadOnly) params.set("filtro", "nao-lidas");
      else params.delete("filtro");
      const query = params.toString();
      router.push(query ? `/notificacoes?${query}` : "/notificacoes");
    },
    [router, searchParams]
  );

  async function reload() {
    const params = new URLSearchParams();
    if (tab !== "all") params.set("tab", tab);
    if (unreadOnly) params.set("filtro", "nao-lidas");
    const res = await fetch(`/api/notifications?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as NotificationInboxInitial;
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    setTabCounts(data.tabCounts);
    setSelected(new Set());
  }

  async function batchRequest(body: Record<string, unknown>) {
    const res = await fetch("/api/notifications/batch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Falha na operação em lote");
  }

  async function markRead(ids: string[]) {
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((n) =>
        ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - ids.filter((id) => {
      const n = notifications.find((x) => x.id === id);
      return n && !n.read_at;
    }).length));
    setSelected(new Set());
    try {
      await batchRequest({ action: "markRead", ids });
      toast.success(ids.length === 1 ? "Marcada como lida" : "Marcadas como lidas");
    } catch {
      toast.error("Não foi possível marcar como lidas.");
      void reload();
    }
  }

  async function remove(ids: string[]) {
    setNotifications((current) => current.filter((n) => !ids.includes(n.id)));
    setSelected(new Set());
    try {
      await batchRequest({ action: "delete", ids });
      toast.success(ids.length === 1 ? "Notificação removida" : "Notificações removidas");
      void reload();
    } catch {
      toast.error("Não foi possível remover.");
      void reload();
    }
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((n) => ({ ...n, read_at: n.read_at ?? now }))
    );
    setUnreadCount(0);
    setSelected(new Set());
    try {
      await batchRequest({ action: "markAllRead" });
      toast.success("Todas marcadas como lidas");
    } catch {
      toast.error("Não foi possível marcar todas.");
      void reload();
    }
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openNotification(notification: AppNotification) {
    if (!notification.read_at) void markRead([notification.id]);
    if (notification.href) router.push(notification.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} não lida${unreadCount === 1 ? "" : "s"}`
            : "Tudo em dia"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() =>
              startTransition(() => updateUrl(tab, !unreadOnly))
            }
          >
            Não lidas
          </Button>
          {unreadCount > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => void markAllRead()}>
              <Check size={14} aria-hidden />
              Marcar todas
            </Button>
          )}
          {selectedIds.length > 0 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void markRead(selectedIds)}
              >
                Marcar ({selectedIds.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void remove(selectedIds)}
              >
                <Trash size={14} aria-hidden />
                Excluir ({selectedIds.length})
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border/70 pb-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => updateUrl(id, unreadOnly))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              tab === id
                ? "bg-brand/10 text-brand"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {label}
            {tabCounts[id] > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                {tabCounts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {notifications.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
          <Bell size={36} className="text-muted-foreground/50" aria-hidden />
          <p className="text-sm font-medium">
            {unreadOnly ? "Nenhuma notificação não lida" : "Inbox zerada"}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Alertas de prep, reuniões processadas, tarefas e falhas do bot aparecem aqui.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/configuracoes">Preferências de alertas</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {day}
              </h2>
              <ul className="space-y-2">
                {items.map((notification) => {
                  const unread = !notification.read_at;
                  const KindIcon =
                    notification.kind != null
                      ? KIND_ICONS[notification.kind]
                      : Bell;

                  return (
                    <li
                      key={notification.id}
                      className={cn(
                        "surface-card flex items-start gap-3 p-4",
                        unread && "border-brand/20 bg-brand/[0.02]"
                      )}
                    >
                      <Checkbox
                        checked={selected.has(notification.id)}
                        onCheckedChange={() => toggleSelect(notification.id)}
                        aria-label="Selecionar notificação"
                        className="mt-1"
                      />

                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <KindIcon size={18} aria-hidden />
                      </span>

                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        className="min-w-0 flex-1 rounded-md text-left transition-colors hover:opacity-90"
                      >
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            unread ? "font-semibold" : "font-medium text-foreground/90"
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground/70">
                          {formatNotificationTimestamp(notification.created_at)}
                        </p>
                        {notification.href && (
                          <span className="mt-2 inline-block text-xs font-medium text-brand">
                            Abrir →
                          </span>
                        )}
                      </button>

                      <div className="flex shrink-0 flex-col gap-1">
                        {unread && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Marcar como lida"
                            onClick={() => void markRead([notification.id])}
                          >
                            <Check size={14} />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground"
                          aria-label="Excluir"
                          onClick={() => void remove([notification.id])}
                        >
                          <X size={14} />
                        </Button>
                      </div>
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
