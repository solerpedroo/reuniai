"use client";

import { useState } from "react";
import { GoogleBrandIcon } from "@/components/brand/google-brand-icon";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type OAuthButtonProps = {
  label?: string;
};

export function OAuthButton({ label = "Continuar com Google" }: OAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const origin = window.location.origin;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setError("Não foi possível iniciar login com Google.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={cn(
          "h-11 w-full rounded-xl border-border/80 bg-background text-sm font-medium",
          "transition-colors hover:border-border hover:bg-muted/20"
        )}
        onClick={signInWithGoogle}
        disabled={loading}
      >
        <GoogleBrandIcon size={18} />
        {loading ? "Redirecionando…" : label}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
