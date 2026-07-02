import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { LibraryHubCard } from "@/lib/library/hub-types";

export function LibraryHubView({ cards }: { cards: LibraryHubCard[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <li key={card.href}>
          <Link
            href={card.href}
            className="surface-card flex h-full flex-col justify-between gap-3 p-4 transition-colors hover:border-brand/30"
          >
            <div>
              <p className="font-medium">{card.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="tabular-nums text-muted-foreground">
                {card.count > 0 ? `${card.count} item${card.count === 1 ? "" : "s"}` : "Explorar"}
              </span>
              <ArrowRight size={16} className="text-brand" aria-hidden />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
