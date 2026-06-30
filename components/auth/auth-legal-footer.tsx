import Link from "next/link";

const linkClassName =
  "text-muted-foreground transition-colors hover:text-foreground";

export function AuthLegalFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <Link href="/privacidade" className={linkClassName}>
        Privacidade
      </Link>
      <span aria-hidden className="text-border">
        ·
      </span>
      <Link href="/termos" className={linkClassName}>
        Termos de uso
      </Link>
    </footer>
  );
}
