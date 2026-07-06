"use client";

import { motion } from "motion/react";
import {
  CalendarBlank,
  CheckCircle,
  Robot,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { PRODUCT_NAME } from "@/lib/brand/config";
import { UI_FEATURE_VISIBILITY } from "@/lib/ui/feature-visibility";
import { cn } from "@/lib/utils";

const JOURNEY_STEPS_ALL = [
  {
    id: "welcome",
    icon: Sparkle,
    label: "Conheça o produto",
    detail: "Gravação, transcrição e IA em uma plataforma",
  },
  {
    id: "consent",
    icon: ShieldCheck,
    label: "Consentimento LGPD",
    detail: "Transparência sobre gravação e processamento",
  },
  {
    id: "bot",
    icon: Robot,
    label: "Bot automático",
    detail: "Entra nas calls do seu calendário",
  },
  {
    id: "calendar",
    icon: CalendarBlank,
    label: "Calendário",
    detail: "Conecte o Google Calendar quando quiser",
  },
] as const;

const JOURNEY_STEPS = JOURNEY_STEPS_ALL.filter((step) => {
  if (UI_FEATURE_VISIBILITY.calendarIntegrations) return true;
  return step.id !== "calendar" && step.id !== "bot";
});

type OnboardingShowcaseProps = {
  activeStep: number;
};

export function OnboardingShowcase({ activeStep }: OnboardingShowcaseProps) {
  return (
    <div className="brand-gradient relative hidden lg:block">
      <div className="relative flex h-full min-h-[640px] flex-col justify-between overflow-hidden p-8 text-white lg:p-10 xl:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="auth-aurora auth-aurora-a" />
          <div className="auth-aurora auth-aurora-b" />
          <div className="auth-grid absolute inset-0 opacity-[0.35]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.2),transparent_42%)]" />
        </div>

        <div className="relative">
          <ReuniaiLogo inverse />
        </div>

        <div className="relative space-y-8">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkle size={14} weight="fill" />
              Configuração inicial
            </p>
            <h2 className="max-w-lg text-3xl font-semibold leading-[1.15] tracking-tight xl:text-4xl">
              Pronto em poucos passos
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/75">
              Configure o {PRODUCT_NAME} para começar a transformar suas reuniões em memória
              organizada — sem complicação.
            </p>
          </div>

          <ol className="relative max-w-md space-y-3">
            {JOURNEY_STEPS.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === activeStep;
              const isComplete = index < activeStep;

              return (
                <motion.li
                  key={item.id}
                  layout
                  className={cn(
                    "relative flex items-start gap-3 rounded-xl border px-4 py-3.5 backdrop-blur-md transition-colors duration-300",
                    isActive
                      ? "border-white/25 bg-white/15 shadow-lg"
                      : isComplete
                        ? "border-white/12 bg-white/8"
                        : "border-white/8 bg-white/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-white/20 text-white"
                        : isComplete
                          ? "bg-white/15 text-white/90"
                          : "bg-white/10 text-white/60"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle size={18} weight="fill" />
                    ) : (
                      <Icon size={18} weight="duotone" />
                    )}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={cn(
                        "text-sm font-medium leading-snug",
                        isActive ? "text-white" : isComplete ? "text-white/85" : "text-white/65"
                      )}
                    >
                      {item.label}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-relaxed",
                        isActive ? "text-white/75" : "text-white/50"
                      )}
                    >
                      {item.detail}
                    </p>
                  </div>
                  {isActive && (
                    <motion.span
                      layoutId="onboarding-active-rail"
                      className="absolute -left-px top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </motion.li>
              );
            })}
          </ol>
        </div>

        <div className="relative">
          <p className="flex items-center gap-1.5 text-xs text-white/60">
            <ShieldCheck size={14} />
            Seus dados ficam isolados por conta — nunca compartilhamos gravações
          </p>
        </div>
      </div>
    </div>
  );
}
