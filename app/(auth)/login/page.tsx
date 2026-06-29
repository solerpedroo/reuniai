import Link from "next/link";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div>
      <div className="mb-4 lg:hidden">
        <ReuniaiLogo compact />
      </div>
      <AuthCard>
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse suas reuniões e insights com IA
            </p>
          </div>

          {params.error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Não foi possível autenticar. Tente novamente.
            </p>
          )}

          <LoginForm nextPath={params.next} />

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </AuthCard>
    </div>
  );
}
