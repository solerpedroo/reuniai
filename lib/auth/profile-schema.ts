import { z } from "zod";
import { USER_LOCALES } from "@/lib/profile/locale";

const localeValues = USER_LOCALES.map((l) => l.value) as [string, ...string[]];

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo")
    .max(80, "Nome muito longo"),
  timezone: z.string().min(1, "Selecione um fuso horário"),
  locale: z.enum(localeValues, { message: "Selecione um idioma" }),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
