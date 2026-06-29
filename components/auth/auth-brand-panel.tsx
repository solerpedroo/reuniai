import {
  CheckCircle,
  Lightning,
  Robot,
  Sparkle,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";

const FEATURES = [
  {
    icon: VideoCamera,
    title: "Gravação automática",
    description: "Bot entra nas calls do Google Meet e Zoom sem esforço manual.",
  },
  {
    icon: Sparkle,
    title: "Resumo por IA",
    description: "Transcrição, decisões e action items prontos após cada reunião.",
  },
  {
    icon: Robot,
    title: "Chat contextual",
    description: "Pergunte qualquer coisa sobre o conteúdo da reunião.",
  },
] as const;

const STATS = [
  { value: "100%", label: "privacidade por usuário" },
  { value: "LGPD", label: "delete e retenção" },
  { value: "PT-BR", label: "interface e IA" },
] as const;

export function AuthBrandPanel() {
  return (
    <div className="brand-gradient relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-20 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-10 bottom-10 size-72 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_50%)]" />
      </div>

      <div className="relative">
        <ReuniaiLogo inverse />
      </div>

      <div className="relative space-y-8">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Lightning size={14} weight="fill" />
            Inteligência de reuniões
          </p>
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Transforme cada call em insights acionáveis
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/75">
            ReuniAI grava, transcreve e resume suas reuniões com IA — da agenda ou
            com um link colado na hora.
          </p>
        </div>

        <ul className="space-y-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li key={feature.title} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/12 backdrop-blur-sm">
                  <Icon size={18} weight="duotone" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-xs leading-relaxed text-white/70">{feature.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/15 bg-white/8 px-3 py-3 backdrop-blur-sm"
            >
              <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
              <p className="text-[11px] leading-snug text-white/65">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-white/60">
          <CheckCircle size={14} />
          Gravação com consentimento dos participantes
        </p>
      </div>
    </div>
  );
}
