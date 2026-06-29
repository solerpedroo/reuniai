"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Gear, SignOut, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "?";
}

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-full"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu da conta"
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full bg-brand/12 text-xs font-semibold text-brand ring-1 ring-brand/20"
          )}
        >
          {initialsFromEmail(email)}
        </span>
      </Button>

      {open && (
        <div
          role="menu"
          className="surface-elevated absolute right-0 z-50 mt-1.5 w-56 overflow-hidden py-1"
        >
          <div className="border-b border-border/70 px-3 py-2.5">
            <p className="truncate text-xs text-muted-foreground">Conectado como</p>
            <p className="truncate text-sm font-medium">{email}</p>
          </div>

          <Link
            role="menuitem"
            href="/configuracoes"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            <Gear size={16} className="text-muted-foreground" />
            Configurações
          </Link>

          <Link
            role="menuitem"
            href="/configuracoes"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            <User size={16} className="text-muted-foreground" />
            Conta
          </Link>

          <div className="my-1 h-px bg-border/70" />

          <button
            type="button"
            role="menuitem"
            disabled={loading}
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <SignOut size={16} />
            {loading ? "Saindo…" : "Sair"}
          </button>
        </div>
      )}
    </div>
  );
}
