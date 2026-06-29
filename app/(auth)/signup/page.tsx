import Link from "next/link";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div>
      <div className="mb-4 lg:hidden">
        <ReuniaiLogo compact />
      </div>
      <AuthCard>
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Criar conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Comece a gravar e analisar suas reuniões
            </p>
          </div>

          <SignupForm />

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </AuthCard>
    </div>
  );
}
