import Link from "next/link";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div>
      <div className="mb-4 lg:hidden">
        <ReuniaiLogo compact />
      </div>
      <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="text-xl">Criar conta</CardTitle>
          <CardDescription>Comece a gravar e analisar suas reuniões</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
    </div>
  );
}
