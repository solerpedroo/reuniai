"use client";

import Link from "next/link";

const linkClassName =
  "font-medium text-foreground underline-offset-4 transition-colors hover:text-brand hover:underline";

type ConsentTextProps = {
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

export function ConsentText({ onLinkClick }: ConsentTextProps) {
  function handleLinkClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
    onLinkClick?.(event);
  }

  return (
    <>
      Li e aceito que o ReuniAI grava e processa áudio de reuniões para transcrição e análise por
      IA, conforme a{" "}
      <Link
        href="/privacidade"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        onClick={handleLinkClick}
      >
        Política de Privacidade (LGPD)
      </Link>{" "}
      e os{" "}
      <Link
        href="/termos"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        onClick={handleLinkClick}
      >
        Termos de Uso
      </Link>
      .
    </>
  );
}
