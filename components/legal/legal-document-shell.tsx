import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { PRODUCT_NAME } from "@/lib/brand/config";

type LegalDocumentShellProps = {
  title: string;
  description: string;
  updatedAt: string;
  children: React.ReactNode;
};

export function LegalDocumentShell({
  title,
  description,
  updatedAt,
  children,
}: LegalDocumentShellProps) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 sm:py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <ReuniaiLogo compact />
        <Link
          href="/signup"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden />
          Voltar
        </Link>
      </div>

      <header className="mb-10 space-y-3 border-b border-border/80 pb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {PRODUCT_NAME}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">Última atualização: {updatedAt}</p>
      </header>

      <article className="prose-legal space-y-6 text-sm leading-relaxed text-foreground">
        {children}
      </article>
    </main>
  );
}
