"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatsCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function AssistantFab() {
  const pathname = usePathname();

  if (pathname === "/assistente" || pathname.startsWith("/assistente?")) {
    return null;
  }

  return (
    <Link
      href="/assistente"
      aria-label="Abrir assistente global"
      title="Assistente — perguntas sobre suas reuniões"
      className={cn(
        "fixed z-40 flex size-12 items-center justify-center rounded-full sm:size-14",
        "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-3 sm:right-4",
        "bg-brand text-brand-foreground shadow-lg shadow-brand/25",
        "transition-transform hover:scale-105 hover:shadow-xl hover:shadow-brand/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "lg:bottom-[calc(2rem+env(safe-area-inset-bottom,0px))] lg:right-8"
      )}
    >
      <ChatsCircle size={26} weight="duotone" aria-hidden />
    </Link>
  );
}
