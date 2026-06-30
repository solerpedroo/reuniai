import { z } from "zod";
import { isPasswordStrong } from "@/components/auth/password-strength";
import { USER_LOCALES } from "@/lib/profile/locale";

const localeValues = USER_LOCALES.map((l) => l.value) as [string, ...string[]];

export const signupProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo")
    .max(80, "Nome muito longo"),
  email: z.string().email("E-mail inválido"),
  timezone: z.string().min(1, "Selecione um fuso horário"),
  locale: z.enum(localeValues, { message: "Selecione um idioma" }),
});

export const signupSecuritySchema = z
  .object({
    password: z
      .string()
      .refine(isPasswordStrong, "A senha não atende a todos os requisitos de segurança"),
    confirmPassword: z.string(),
    consent: z.boolean(),
  })
  .refine((data) => data.consent, {
    message: "Você precisa aceitar os termos para continuar",
    path: ["consent"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SignupProfileInput = z.infer<typeof signupProfileSchema>;
export type SignupSecurityInput = z.infer<typeof signupSecuritySchema>;
