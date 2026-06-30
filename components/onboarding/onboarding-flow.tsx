"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  Check,
  Gear,
  Lightning,
  Microphone,
  Robot,
  ShieldCheck,
  Sparkle,
  VideoCamera,
} from "@phosphor-icons/react";
import { completeOnboardingAction } from "@/app/(onboarding)/onboarding/actions";
import { ConsentText } from "@/components/legal/consent-text";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { OnboardingShowcase } from "@/components/onboarding/onboarding-showcase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Bem-vindo ao ReuniAI",
    description:
      "Gravamos suas reuniões com um bot, transcrevemos o áudio e extraímos resumos, decisões e action items com IA.",
  },
  {
    title: "Consentimento e LGPD",
    description:
      "Reuniões incluem gravação de voz. Você é responsável por informar os participantes e obter consentimento quando exigido por lei.",
  },
  {
    title: "Auto-join do bot",
    description:
      "Quando ativado, o bot entra automaticamente nas reuniões do seu calendário com link de vídeo, identificado como ReuniAI — seu nome.",
  },
  {
    title: "Calendário",
    description:
      "Conecte o Google Calendar para o bot encontrar suas reuniões. Você pode fazer isso agora ou depois.",
  },
] as const;

const WELCOME_FEATURES = [
  {
    icon: VideoCamera,
    title: "Meet, Zoom e Teams",
    description: "O bot entra nas calls com câmera ligada e nome personalizado",
  },
  {
    icon: Microphone,
    title: "Transcrição completa",
    description: "Cada palavra indexada, pesquisável e com speakers identificados",
  },
  {
    icon: Sparkle,
    title: "Resumo por IA",
    description: "Decisões, action items e próximos passos em segundos",
  },
  {
    icon: Lightning,
    title: "Prep inteligente",
    description: "Chegue na call já contextualizado com o histórico da série",
  },
] as const;

const CONSENT_POINTS = [
  "Áudio das reuniões é gravado e processado para transcrição",
  "Dados ficam isolados na sua conta, conforme a LGPD",
  "Você pode excluir gravações e transcrições a qualquer momento",
] as const;

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [autoJoin, setAutoJoin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const loading = isPending;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step]!;

  function completeOnboarding() {
    if (!consent) {
      setError("Você precisa aceitar o consentimento para continuar.");
      setStep(1);
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await completeOnboardingAction(autoJoin, true);
      if (res?.error) {
        setError(res.error);
      }
    });
  }

  function handleNext() {
    if (step === 1 && !consent) {
      setError("Aceite o consentimento para continuar.");
      return;
    }
    setError(null);
    if (isLast) {
      completeOnboarding();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <OnboardingShowcase activeStep={step} />

      <div className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <OnboardingShell
          badge={`Passo ${step + 1} de ${STEPS.length}`}
          title={current.title}
          description={current.description}
          step={step}
          totalSteps={STEPS.length}
          footer={
            <div className="space-y-4">
              {error && (
                <p className="text-center text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 rounded-xl"
                    onClick={() => {
                      setError(null);
                      setStep((s) => s - 1);
                    }}
                    disabled={loading}
                  >
                    <ArrowLeft size={18} />
                    Voltar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="brand"
                  size="lg"
                  className={cn("h-11 flex-1 rounded-xl font-semibold brand-glow", step === 0 && "w-full")}
                  onClick={handleNext}
                  disabled={loading}
                >
                  {loading ? "Salvando…" : isLast ? "Ir ao dashboard" : "Continuar"}
                  {!loading && !isLast && <ArrowRight size={18} weight="bold" />}
                </Button>
              </div>
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {WELCOME_FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.title}
                        className="hover-lift group rounded-xl border border-border/80 bg-muted/20 p-4"
                      >
                        <div className="icon-tile mb-3 flex size-10 items-center justify-center rounded-lg">
                          <Icon size={20} weight="duotone" className="text-brand" aria-hidden />
                        </div>
                        <p className="text-sm font-medium text-foreground">{feature.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <ul className="space-y-2.5 rounded-xl border border-border/80 bg-muted/15 p-4">
                    {CONSENT_POINTS.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <ShieldCheck
                          size={16}
                          weight="duotone"
                          className="mt-0.5 shrink-0 text-brand"
                          aria-hidden
                        />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <Label
                    htmlFor="consent"
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm font-normal leading-relaxed transition-colors",
                      consent
                        ? "border-brand/30 bg-brand/5"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <Checkbox
                      id="consent"
                      className="mt-0.5"
                      checked={consent}
                      onCheckedChange={(value) => setConsent(value === true)}
                    />
                    <span>
                      <ConsentText />
                    </span>
                  </Label>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/15 p-4">
                    <div className="space-y-1">
                      <Label htmlFor="auto-join" className="text-sm font-medium">
                        Entrar automaticamente nas reuniões
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Recomendado para não perder calls do calendário
                      </p>
                    </div>
                    <Switch id="auto-join" checked={autoJoin} onCheckedChange={setAutoJoin} />
                  </div>

                  <div
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      autoJoin
                        ? "border-brand/25 bg-gradient-to-b from-brand/8 to-transparent"
                        : "border-border/80 bg-muted/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="icon-tile flex size-11 items-center justify-center rounded-xl">
                        <Robot size={22} weight="duotone" className="text-brand" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {autoJoin ? "Bot ativo no calendário" : "Entrada manual"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {autoJoin
                            ? "ReuniAI entra automaticamente quando detectar um link de vídeo"
                            : "Você convida o bot manualmente em cada reunião"}
                        </p>
                      </div>
                      {autoJoin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/12 px-2.5 py-1 text-[11px] font-medium text-brand">
                          <Check size={12} weight="bold" />
                          Ativo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="relative overflow-hidden rounded-xl border border-border/80 bg-muted/15 px-6 py-10 text-center">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,from-brand/12,transparent_60%)]"
                  />
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-brand/12 text-brand ring-1 ring-brand/15">
                      <CalendarBlank size={24} weight="duotone" aria-hidden />
                    </div>
                    <div className="max-w-xs space-y-1">
                      <p className="text-sm font-medium text-foreground">Google Calendar em breve</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        A integração com calendário chega na próxima onda. Por agora, continue e
                        configure depois.
                      </p>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                      <Gear size={14} />
                      Disponível em Configurações
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </OnboardingShell>
      </div>
    </div>
  );
}
