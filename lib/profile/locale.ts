export type UserLocale = "pt-BR" | "en" | "es";

export const USER_LOCALES: { value: UserLocale; label: string }[] = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

export function parseUserLocale(value: string | null | undefined): UserLocale {
  if (value === "en" || value === "es" || value === "pt-BR") return value;
  return "pt-BR";
}

/** Código de idioma para o Vexa/Deepgram. */
export function localeToVexaLanguage(locale: UserLocale): string {
  if (locale === "en") return "en";
  if (locale === "es") return "es";
  return "pt";
}
