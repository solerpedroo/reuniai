"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Trash, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNotificationRelativeTime } from "@/lib/notifications/format-relative-time";
import type { AppNotification } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread";

export function NotificationPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  const visibleNotifications = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((notification) => !notification.read_at)
        : notifications,
    [filter, notifications]
  );

  const hasRead = notifications.some((notification) => notification.read_at);

  const load = useCallback(async (activeFilter: Filter = filter) => {
    setLoading(true);
    try {
      const query = activeFilter === "unread" ? "?filter=unread" : "";
      const res = await fetch(`/api/notifications${query}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (open) void load(filter);
  }, [open, filter, load]);

  async function patchNotification(body: Record<string, unknown>) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Falha ao atualizar notificação");
  }

  async function removeNotification(body: Record<string, unknown>) {
    const res = await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Falha ao remover notificação");
  }

  const markRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() }
          : notification
      )
    );
    try {
      await patchNotification({ id });
    } catch {
      toast.error("Não foi possível marcar como lida.");
      void load();
    }
  }, [load]);

  const dismiss = useCallback(
    async (id: string) => {
      setNotifications((current) => current.filter((notification) => notification.id !== id));
      try {
        await removeNotification({ id });
      } catch {
        toast.error("Não foi possível remover a notificação.");
        void load();
      }
    },
    [load]
  );

  async function markAllRead() {
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? now,
      }))
    );
    try {
      await patchNotification({ markAllRead: true });
      toast.success("Todas marcadas como lidas.");
    } catch {
      toast.error("Não foi possível marcar todas como lidas.");
      void load();
    }
  }

  async function clearRead() {
    setNotifications((current) => current.filter((notification) => !notification.read_at));
    try {
      await removeNotification({ clearRead: true });
      toast.success("Notificações lidas removidas.");
    } catch {
      toast.error("Não foi possível limpar as notificações lidas.");
      void load();
    }
  }

  function openNotification(notification: AppNotification) {
    if (!notification.read_at) {
      void markRead(notification.id);
    }
    if (notification.href) {
      setOpen(false);
      router.push(notification.href);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-2rem,24rem)] overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notificações</p>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} não lidas</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-2 text-xs"
              onClick={() => void markAllRead()}
            >
              <Check size={14} aria-hidden />
              Marcar todas
            </Button>
          )}
        </div>

        <div className="flex gap-1 border-b border-border/70 px-3 py-2">
          {(["all", "unread"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === tab
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {tab === "all" ? "Todas" : "Não lidas"}
            </button>
          ))}
        </div>

        <div className="max-h-[min(60vh,22rem)] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : visibleNotifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell size={28} className="mx-auto mb-2 text-muted-foreground/50" aria-hidden />
              <p className="text-sm font-medium text-foreground">
                {filter === "unread" ? "Tudo em dia" : "Nenhuma notificação"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {filter === "unread"
                  ? "Você leu todas as notificações recentes."
                  : "Alertas de prep, reuniões e follow-ups aparecem aqui."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {visibleNotifications.map((notification) => {
                const unread = !notification.read_at;

                return (
                  <li key={notification.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 pr-10 text-left transition-colors hover:bg-muted/40",
                        unread && "bg-brand/[0.04]"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          unread ? "bg-brand" : "bg-transparent"
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-sm leading-snug",
                              unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                            )}
                          >
                            {notification.title}
                          </span>
                          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                            {formatNotificationRelativeTime(notification.created_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                          {notification.body}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      aria-label="Remover notificação"
                      onClick={(event) => {
                        event.stopPropagation();
                        void dismiss(notification.id);
                      }}
                      className={cn(
                        "absolute right-2 top-2 flex size-7 items-center justify-center rounded-md text-muted-foreground",
                        "opacity-70 transition-opacity hover:bg-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      )}
                    >
                      <X size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {(hasRead || notifications.length > 0) && (
          <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-muted/20 px-3 py-2">
            {hasRead ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => void clearRead()}
              >
                <Trash size={14} aria-hidden />
                Limpar lidas
              </Button>
            ) : (
              <span />
            )}
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
              <Link href="/configuracoes" onClick={() => setOpen(false)}>
                Preferências
              </Link>
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
