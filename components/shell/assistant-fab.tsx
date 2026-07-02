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
        "fixed bottom-6 right-4 z-40 flex size-14 items-center justify-center rounded-full",
        "bg-brand text-brand-foreground shadow-lg shadow-brand/25",
        "transition-transform hover:scale-105 hover:shadow-xl hover:shadow-brand/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "lg:bottom-8 lg:right-8"
      )}
    >
      <ChatsCircle size={26} weight="duotone" aria-hidden />
    </Link>
  );
}
