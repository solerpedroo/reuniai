import Link from "next/link";
import { ArrowRight, Books } from "@phosphor-icons/react/dist/ssr";

export function LibraryHomeCard() {
  return (
    <Link
      href="/biblioteca"
      className="surface-card mt-4 flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
    >
      <div className="flex items-center gap-3">
        <Books size={20} className="text-brand" aria-hidden />
        <div>
          <p className="text-sm font-medium">Explorar biblioteca</p>
          <p className="text-xs text-muted-foreground">
            Prep, decisões, destaques, notas e mais em um só lugar
          </p>
        </div>
      </div>
      <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
