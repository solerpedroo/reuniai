import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { PRODUCT_NAME } from "@/lib/brand/config";

const FEATURES = [
  "Transcrição indexada e pesquisável",
  "Resumos e action items gerados por IA",
  "Dados privados, em conformidade com a LGPD",
] as const;

export function AuthShowcase() {
  return (
    <div className="relative flex h-full min-h-screen flex-col justify-between p-10 xl:p-14">
      <div className="auth-panel-accent" aria-hidden />

      <div className="relative">
        <ReuniaiLogo inverse />
      </div>

      <div className="relative max-w-[26rem] space-y-10">
        <div className="space-y-4">
          <h2 className="text-[1.875rem] font-semibold leading-[1.18] tracking-[-0.025em] text-white xl:text-[2.375rem]">
            Reuniões que viram conhecimento
          </h2>
          <p className="text-[15px] leading-relaxed text-white/55">
            {PRODUCT_NAME} grava, transcreve e resume suas calls — automaticamente.
          </p>
        </div>

        <ul className="space-y-3.5" role="list">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-[14px] leading-snug text-white/70">
              <span
                className="mt-[7px] size-1 shrink-0 rounded-full bg-brand"
                aria-hidden
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/35">
        Gravação com consentimento dos participantes
      </p>
    </div>
  );
}
