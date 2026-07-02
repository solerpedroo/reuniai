import Link from "next/link";
import { ArrowRight, BookmarkSimple } from "@phosphor-icons/react/dist/ssr";

export function HighlightsHomeCard({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      href="/destaques"
      className="surface-card mt-4 flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
    >
      <div className="flex items-center gap-3">
        <BookmarkSimple size={20} className="text-brand" aria-hidden />
        <div>
          <p className="text-sm font-medium">Biblioteca de destaques</p>
          <p className="text-xs text-muted-foreground">
            {count} momento{count === 1 ? "" : "s"} marcado{count === 1 ? "" : "s"} nas reuniões
          </p>
        </div>
      </div>
      <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
