"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Gear, SignOut, UserCircle } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

type UserMenuProps = {
  name?: string | null;
  email?: string | null;
};

function getInitials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function UserMenu({ name, email }: UserMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const displayName = name?.trim() || "Minha conta";
  const initials = getInitials(name);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu da conta"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-brand-foreground shadow-sm outline-none transition-all duration-150 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[15rem]">
        <DropdownMenuLabel className="flex items-center gap-3 px-2.5 py-2 font-normal">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-brand-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight text-foreground">
              {displayName}
            </p>
            {email && (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserCircle weight="duotone" aria-hidden />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <Gear weight="duotone" aria-hidden />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
          disabled={loading}
        >
          <SignOut weight="duotone" aria-hidden />
          {loading ? "Saindo…" : "Sair da conta"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
