import Link from "next/link";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { AuthProductPreview } from "@/components/auth/auth-product-preview";

export function AuthShowcase() {
  return (
    <div className="relative flex h-full min-h-screen flex-col justify-between p-10 xl:p-14">
      <div className="relative">
        <ReuniaiLogo markSize={52} wordmarkSize="lg" fillCutouts />
      </div>

      <div className="relative max-w-md space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Depois da call
          </p>
          <h2 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.03em] text-foreground xl:text-[2.125rem]">
            Sua próxima reunião já pode virar um plano de ação
          </h2>
          <p className="max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            Gravação, transcrição e resumo em um só lugar — sem perder o que foi decidido.
          </p>
        </div>

        <AuthProductPreview />
      </div>

      <p className="relative max-w-sm text-xs leading-relaxed text-muted-foreground">
        Gravação sempre com consentimento dos participantes.{" "}
        <Link
          href="/privacidade"
          className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-brand hover:underline"
        >
          Saiba como tratamos seus dados
        </Link>
        .
      </p>
    </div>
  );
}
