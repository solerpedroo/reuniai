import Link from "next/link";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-4">
        <ReuniaiLogo />
        <div>
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription>Acesse suas reuniões e insights com IA</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {params.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não foi possível autenticar. Tente novamente.
          </p>
        )}
        <LoginForm nextPath={params.next} />
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
