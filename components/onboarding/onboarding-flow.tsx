"use client";

import { useState, useTransition } from "react";
import { completeOnboardingAction } from "@/app/(onboarding)/onboarding/actions";
import { Check, VideoCamera } from "@phosphor-icons/react";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      "Quando ativado, o ReuniAI Bot entra automaticamente nas reuniões do seu calendário com link de vídeo.",
  },
  {
    title: "Calendário",
    description:
      "Na próxima etapa você poderá conectar o Google Calendar. Por agora, pode continuar e configurar depois.",
  },
] as const;

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [autoJoin, setAutoJoin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const loading = isPending;

  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

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

  const current = STEPS[step];

  return (
    <Card className="surface-card overflow-hidden border-0 shadow-none">
      <CardHeader className="space-y-4">
        <ReuniaiLogo />
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="label-caps">
              Passo {step + 1} de {STEPS.length}
            </p>
            <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <CardTitle className="text-xl">{current.title}</CardTitle>
          <CardDescription className="mt-2">{current.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 0 && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <VideoCamera size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              Bot entra em Meet, Zoom e Teams
            </li>
            <li className="flex items-start gap-2">
              <Check size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              Transcrição completa + resumo por IA
            </li>
          </ul>
        )}

        {step === 1 && (
          <Label
            htmlFor="consent"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 text-sm font-normal leading-relaxed transition-colors hover:bg-muted/40",
              consent && "border-brand/30 bg-brand/5"
            )}
          >
            <Checkbox
              id="consent"
              className="mt-0.5"
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
            />
            <span>
              Li e aceito que o ReuniAI grava e processa áudio de reuniões para transcrição
              e análise por IA, conforme a LGPD e os termos de uso.
            </span>
          </Label>
        )}

        {step === 2 && (
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-1">
              <Label htmlFor="auto-join">Entrar automaticamente nas reuniões</Label>
              <p className="text-xs text-muted-foreground">Recomendado para não perder calls</p>
            </div>
            <Switch id="auto-join" checked={autoJoin} onCheckedChange={setAutoJoin} />
          </div>
        )}

        {step === 3 && (
          <p className="text-sm text-muted-foreground">
            Vá em <strong className="text-foreground">Configurações</strong> quando quiser conectar
            o Google Calendar.
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
            >
              Voltar
            </Button>
          )}
          <Button type="button" className="flex-1" onClick={handleNext} disabled={loading}>
            {loading ? "Salvando…" : isLast ? "Ir ao dashboard" : "Continuar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
