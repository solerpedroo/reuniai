"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AppNotification } from "@/lib/workflow/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unread = notifications.filter((n) => !n.read_at).length;

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications ?? []);
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const markRead = useCallback(
    async (id: string) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    },
    [load]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notificações</DialogTitle>
          <DialogDescription>Alertas de prep, reuniões e follow-ups</DialogDescription>
        </DialogHeader>
        {notifications.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma notificação</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                {notification.href ? (
                  <Link
                    href={notification.href}
                    onClick={() => {
                      void markRead(notification.id);
                      setOpen(false);
                    }}
                    className="block"
                  >
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.body}</p>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => void markRead(notification.id)}
                  >
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.body}</p>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
