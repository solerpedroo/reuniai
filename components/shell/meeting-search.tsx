"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";

export function MeetingSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/reunioes?q=${encodeURIComponent(term)}` : "/reunioes");
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden w-full max-w-xs md:block">
      <MagnifyingGlass
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar reuniões…"
        className="h-8 pl-9 text-xs"
        aria-label="Buscar reuniões"
      />
    </form>
  );
}
