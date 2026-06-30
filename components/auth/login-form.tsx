"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { ArrowRight, EnvelopeSimple, LockKey } from "@phosphor-icons/react";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { OAuthButton } from "@/components/auth/oauth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

function safeNextPath(next?: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.startsWith("/login") || next.startsWith("/signup")) return "/";
  return next;
}

type LoginFormProps = {
  nextPath?: string;
  authError?: boolean;
};

export function LoginForm({ nextPath, authError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);

    if (signInError) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.push(safeNextPath(nextPath));
    router.refresh();
  }

  return (
    <AuthFormShell
      title="Entrar"
      description="Acesse suas transcrições, resumos e action items."
      footer={
        <>
          Não tem conta?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 transition-colors hover:text-brand hover:underline"
          >
            Criar conta grátis
          </Link>
        </>
      }
    >
      {authError && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Não foi possível autenticar. Tente novamente ou use outro método.
        </div>
      )}

      <OAuthButton />

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField id="email" label="E-mail" icon={EnvelopeSimple}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="auth-input"
          />
        </AuthField>

        <AuthField id="password" label="Senha" icon={LockKey}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="auth-input"
          />
        </AuthField>

        {error && (
          <p className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="brand"
          size="lg"
          className={cn("h-11 w-full rounded-lg text-sm font-medium")}
          disabled={loading}
        >
          {loading ? "Entrando…" : "Entrar"}
          {!loading && <ArrowRight size={18} weight="bold" />}
        </Button>
      </form>
    </AuthFormShell>
  );
}
