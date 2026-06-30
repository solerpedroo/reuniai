"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  EnvelopeSimple,
  FloppyDisk,
  GlobeHemisphereWest,
  UserCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { updateProfileAction } from "@/app/(app)/perfil/actions";
import { BotBrandingPreview } from "@/components/settings/bot-branding-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profileUpdateSchema } from "@/lib/auth/profile-schema";
import { TIMEZONE_OPTIONS } from "@/lib/auth/timezones";
import { buildBotDisplayName } from "@/lib/brand/bot-name";
import { USER_LOCALES, type UserLocale } from "@/lib/profile/locale";
import { cn } from "@/lib/utils";

type ProfileFormProps = {
  initialDisplayName: string;
  email: string;
  initialTimezone: string;
  initialLocale: UserLocale;
};

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfileForm({
  initialDisplayName,
  email,
  initialTimezone,
  initialLocale,
}: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [locale, setLocale] = useState<UserLocale>(initialLocale);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const initials = getInitials(displayName, email);
  const botPreviewName = useMemo(
    () => buildBotDisplayName({ displayName, email }),
    [displayName, email]
  );

  const isDirty =
    displayName !== initialDisplayName ||
    timezone !== initialTimezone ||
    locale !== initialLocale;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = profileUpdateSchema.safeParse({
      displayName,
      timezone,
      locale,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os campos");
      return;
    }

    startTransition(async () => {
      const result = await updateProfileAction(parsed.data);
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Perfil atualizado");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-brand-foreground shadow-sm"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">
              {displayName.trim() || email}
            </p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border p-5">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2 text-sm font-medium">
              <UserCircle size={16} className="text-muted-foreground" aria-hidden />
              Nome completo
            </Label>
            <Input
              id="displayName"
              autoComplete="name"
              placeholder="Pedro Soler"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email" className="flex items-center gap-2 text-sm font-medium">
              <EnvelopeSimple size={16} className="text-muted-foreground" aria-hidden />
              E-mail
            </Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              readOnly
              disabled
              className="bg-muted/40"
            />
            <p className="text-xs text-muted-foreground">
              O e-mail da conta não pode ser alterado aqui.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2 text-sm font-medium">
                <GlobeHemisphereWest size={16} className="text-muted-foreground" aria-hidden />
                Fuso horário
              </Label>
              <Select value={timezone} onValueChange={setTimezone} disabled={pending}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                  {!TIMEZONE_OPTIONS.some((tz) => tz.value === timezone) && (
                    <SelectItem value={timezone}>{timezone}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locale" className="flex items-center gap-2 text-sm font-medium">
                <Briefcase size={16} className="text-muted-foreground" aria-hidden />
                Idioma
              </Label>
              <Select
                value={locale}
                onValueChange={(v) => setLocale(v as UserLocale)}
                disabled={pending}
              >
                <SelectTrigger id="locale">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {USER_LOCALES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error && (
          <p
            className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="brand"
            disabled={pending || !isDirty}
            className={cn("gap-2", isDirty && "brand-glow")}
          >
            <FloppyDisk size={18} weight="bold" aria-hidden />
            {pending ? "Salvando…" : "Salvar alterações"}
          </Button>
          {isDirty && !pending && (
            <p className="text-xs text-muted-foreground">Você tem alterações não salvas</p>
          )}
        </div>
      </form>

      <aside className="space-y-3">
        <p className="text-sm font-medium">Como o bot aparece nas calls</p>
        <BotBrandingPreview botDisplayName={botPreviewName} />
      </aside>
    </div>
  );
}
