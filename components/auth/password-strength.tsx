"use client";

import { Check, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Requirement = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: Requirement[] = [
  { id: "length", label: "Pelo menos 8 caracteres", test: (v) => v.length >= 8 },
  { id: "lower", label: "Uma letra minúscula", test: (v) => /[a-z]/.test(v) },
  { id: "upper", label: "Uma letra maiúscula", test: (v) => /[A-Z]/.test(v) },
  { id: "number", label: "Um número", test: (v) => /\d/.test(v) },
  { id: "special", label: "Um caractere especial (!@#$…)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function getPasswordScore(value: string): number {
  return PASSWORD_REQUIREMENTS.reduce((acc, r) => acc + (r.test(value) ? 1 : 0), 0);
}

export function isPasswordStrong(value: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(value));
}

const STRENGTH_META = [
  { label: "Muito fraca", color: "bg-destructive", text: "text-destructive" },
  { label: "Fraca", color: "bg-destructive", text: "text-destructive" },
  { label: "Razoável", color: "bg-amber-500", text: "text-amber-600" },
  { label: "Boa", color: "bg-amber-500", text: "text-amber-600" },
  { label: "Forte", color: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Excelente", color: "bg-emerald-500", text: "text-emerald-600" },
] as const;

export function PasswordStrength({ value }: { value: string }) {
  const score = getPasswordScore(value);
  const meta = STRENGTH_META[score];
  const total = PASSWORD_REQUIREMENTS.length;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i < score ? meta.color : "bg-border"
              )}
            />
          ))}
        </div>
        {value.length > 0 && (
          <p className={cn("text-xs font-medium transition-colors", meta.text)}>
            Força da senha: {meta.label}
          </p>
        )}
      </div>

      <ul className="space-y-1.5">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const ok = req.test(value);
          return (
            <li
              key={req.id}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                ok ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full transition-colors",
                  ok ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {ok ? <Check size={11} weight="bold" /> : <X size={11} weight="bold" />}
              </span>
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
