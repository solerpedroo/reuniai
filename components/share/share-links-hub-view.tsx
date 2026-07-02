"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, LinkSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatNotificationTimestamp } from "@/lib/notifications/format-relative-time";
import type { ShareLinksHub } from "@/lib/meetings/share-hub-types";
import { cn } from "@/lib/utils";

export function ShareLinksHubView({ hub }: { hub: ShareLinksHub }) {
  const router = useRouter();
  const [items, setItems] = useState(hub.items);

  const revoke = useCallback(
    async (id: string) => {
      if (!confirm("Revogar este link? Quem tiver a URL perderá o acesso.")) return;
      setItems((current) => current.filter((item) => item.id !== id));
      try {
        const res = await fetch("/api/share-links", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "revoke", id }),
        });
        if (!res.ok) throw new Error("Falha ao revogar");
        toast.success("Link revogado");
        router.refresh();
      } catch {
        toast.error("Não foi possível revogar");
        router.refresh();
      }
    },
    [router]
  );

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  if (items.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <LinkSimple size={32} className="mx-auto mb-3 text-muted-foreground/50" aria-hidden />
        <p className="text-sm font-medium">Nenhum link ativo</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie links read-only na página de uma reunião processada.
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/reunioes">Ver reuniões</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="surface-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link
                href={`/reunioes/${item.meetingId}`}
                className="font-medium hover:text-brand"
              >
                {item.meetingTitle}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{item.permissionsSummary}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Token {item.tokenSuffix} · expira{" "}
                {formatNotificationTimestamp(item.expiresAt)}
              </p>
              <span
                className={cn(
                  "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                  item.status === "active"
                    ? "bg-emerald-500/10 text-emerald-700"
                    : item.status === "expired"
                      ? "bg-muted text-muted-foreground"
                      : "bg-destructive/10 text-destructive"
                )}
              >
                {item.status === "active"
                  ? "Ativo"
                  : item.status === "expired"
                    ? "Expirado"
                    : "Revogado"}
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyUrl(item.shareUrl)}
              >
                <Copy size={14} aria-hidden />
                Copiar
              </Button>
              {item.status === "active" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void revoke(item.id)}
                >
                  <Trash size={14} aria-hidden />
                  Revogar
                </Button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
