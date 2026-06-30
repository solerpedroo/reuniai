"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  EnvelopeSimple,
  GlobeHemisphereWest,
  LockKey,
  UserCircle,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { AuthDivider } from "@/components/auth/auth-divider";
import { ConsentText } from "@/components/legal/consent-text";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { OAuthButton } from "@/components/auth/oauth-button";
import { PasswordStrength, isPasswordStrong } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeSignupProfileAction } from "@/app/(auth)/signup/actions";
import { signupProfileSchema, signupSecuritySchema } from "@/lib/auth/signup-schema";
import { getDefaultTimezone, TIMEZONE_OPTIONS } from "@/lib/auth/timezones";
import { buildBotDisplayName } from "@/lib/brand/bot-name";
import { createClient } from "@/lib/supabase/client";
import { USER_LOCALES } from "@/lib/profile/locale";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "profile", title: "Criar conta", description: "Informações básicas para personalizar sua experiência." },
  { id: "security", title: "Definir senha", description: "Escolha uma senha segura e aceite os termos de uso." },
] as const;

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [locale, setLocale] = useState("pt-BR");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTimezone(getDefaultTimezone());
  }, []);

  const botPreviewName = useMemo(
    () => buildBotDisplayName({ displayName, email: email || null }),
    [displayName, email]
  );

  function handleNextStep() {
    setError(null);
    const parsed = signupProfileSchema.safeParse({
      displayName,
      email,
      timezone,
      locale,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os campos");
      return;
    }
    setStep(1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const profileParsed = signupProfileSchema.safeParse({
      displayName,
      email,
      timezone,
      locale,
    });
    if (!profileParsed.success) {
      setError(profileParsed.error.issues[0]?.message ?? "Dados inválidos");
      setStep(0);
      return;
    }

    const securityParsed = signupSecuritySchema.safeParse({
      password,
      confirmPassword,
      consent,
    });
    if (!securityParsed.success) {
      setError(securityParsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: profileParsed.data.email,
      password: securityParsed.data.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: profileParsed.data.displayName,
          display_name: profileParsed.data.displayName,
          timezone: profileParsed.data.timezone,
          locale: profileParsed.data.locale,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      const profileResult = await completeSignupProfileAction({
        displayName: profileParsed.data.displayName,
        timezone: profileParsed.data.timezone,
        locale: profileParsed.data.locale,
      });
      if ("error" in profileResult) {
        setError(profileResult.error);
        setLoading(false);
        return;
      }
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setInfo("Enviamos um link de confirmação. Após validar o e-mail, seu perfil já estará configurado.");
    setLoading(false);
  }

  const currentStep = STEPS[step]!;

  return (
    <AuthFormShell
      badge={`Etapa ${step + 1} de ${STEPS.length}`}
      title={currentStep.title}
      description={currentStep.description}
      footer={
        <>
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 transition-colors hover:text-brand hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          {STEPS.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                index <= step ? "bg-brand" : "bg-border"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Na call, seu bot aparecerá como{" "}
          <span className="font-medium text-foreground">{botPreviewName}</span>
        </p>
      </div>

      {step === 0 && (
        <>
          <OAuthButton label="Cadastrar com Google" />
          <AuthDivider label="ou preencha seus dados" />

          <div className="space-y-4">
            <AuthField id="displayName" label="Nome completo" icon={UserCircle}>
              <Input
                id="displayName"
                autoComplete="name"
                placeholder="João da Silva"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="auth-input"
              />
            </AuthField>

            <AuthField id="signup-email" label="E-mail" icon={EnvelopeSimple}>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </AuthField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label
                  htmlFor="timezone"
                  className="flex items-center gap-2 text-[13px] font-medium text-foreground"
                >
                  <GlobeHemisphereWest
                    size={16}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  Fuso horário
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone" className="auth-input w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                    {!TIMEZONE_OPTIONS.some((tz) => tz.value === timezone) && (
                      <SelectItem value={timezone}>{timezone}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 space-y-2">
                <Label
                  htmlFor="locale"
                  className="flex items-center gap-2 text-[13px] font-medium text-foreground"
                >
                  <Briefcase size={16} className="shrink-0 text-muted-foreground" aria-hidden />
                  Idioma
                </Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger id="locale" className="auth-input w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_LOCALES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="button"
              variant="brand"
              size="lg"
              className="h-11 w-full rounded-lg font-medium"
              onClick={handleNextStep}
            >
              Continuar
              <ArrowRight size={18} weight="bold" />
            </Button>
          </div>
        </>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form
            key="security"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <AuthField
              id="signup-password"
              label="Senha"
              icon={LockKey}
              below={password.length > 0 ? <PasswordStrength value={password} /> : undefined}
            >
              <PasswordInput
                id="signup-password"
                autoComplete="new-password"
                placeholder="Crie uma senha forte"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="auth-input"
              />
            </AuthField>

            <AuthField
              id="signup-confirm"
              label="Confirmar senha"
              icon={LockKey}
              error={
                confirmPassword.length > 0 && password !== confirmPassword
                  ? "As senhas não coincidem"
                  : undefined
              }
            >
              <PasswordInput
                id="signup-confirm"
                autoComplete="new-password"
                placeholder="Repita a senha"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="auth-input"
              />
            </AuthField>

            <Label
              htmlFor="consent"
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-muted/15 p-4 text-sm font-normal leading-relaxed transition-colors hover:bg-muted/25"
            >
              <Checkbox
                id="consent"
                className="mt-0.5"
                checked={consent}
                onCheckedChange={(value) => setConsent(value === true)}
                disabled={loading}
              />
              <span>
                <ConsentText />
              </span>
            </Label>

            {error && (
              <p className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground" role="status">
                {info}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 rounded-lg"
                onClick={() => {
                  setError(null);
                  setStep(0);
                }}
                disabled={loading}
              >
                <ArrowLeft size={18} />
                Voltar
              </Button>
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="h-11 flex-1 rounded-lg font-medium"
                disabled={
                  loading ||
                  !consent ||
                  !isPasswordStrong(password) ||
                  password !== confirmPassword
                }
              >
                {loading ? "Criando conta…" : "Criar conta"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthFormShell>
  );
}
