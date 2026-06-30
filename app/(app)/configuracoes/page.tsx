import type { Profile } from "@/lib/supabase/types";
import { PageHeader } from "@/components/layout/page-header";
import { AccountActions } from "@/components/settings/account-actions";
import { AutoJoinToggle } from "@/components/settings/auto-join-toggle";
import { CalendarConnections } from "@/components/settings/calendar-connections";
import { RetentionSettings } from "@/components/settings/retention-settings";
import { LocaleAndTemplateSettings } from "@/components/settings/locale-template-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCalendarConnection } from "@/lib/calendar/queries";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisTemplateId } from "@/lib/analysis/template-types";
import { parseTemplateId } from "@/lib/analysis/template-types";
import { parseUserLocale, type UserLocale } from "@/lib/profile/locale";
import type { NotificationPrefs } from "@/lib/workflow/types";

const CALENDAR_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> = {
  connected: { tone: "ok", text: "Calendário conectado e sincronizado." },
  error: { tone: "error", text: "Não foi possível conectar o calendário. Tente novamente." },
  no_refresh: {
    tone: "error",
    text: "O provedor não retornou um token de atualização. Remova o acesso do app e tente novamente.",
  },
};

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string; provider?: string }>;
}) {
  const { calendar, provider } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let autoJoin = true;
  let retentionDays = 365;
  let notificationPrefs: NotificationPrefs = {
    email: false,
    push: false,
    prep: true,
    completed: true,
    digest: true,
  };
  let locale: UserLocale = "pt-BR";
  let defaultTemplate: AnalysisTemplateId = "generic";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("auto_join_enabled, retention_days, notification_prefs, locale, default_analysis_template")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const typed = profile as Pick<Profile, "auto_join_enabled" | "retention_days"> & {
        notification_prefs?: NotificationPrefs;
        locale?: string;
        default_analysis_template?: string;
      };
      autoJoin = typed.auto_join_enabled;
      retentionDays = typed.retention_days;
      if (typed.notification_prefs) notificationPrefs = typed.notification_prefs;
      locale = parseUserLocale(typed.locale);
      defaultTemplate = parseTemplateId(typed.default_analysis_template);
    }
  }

  const googleConnection = await getCalendarConnection(supabase, "google");
  const outlookConnection = await getCalendarConnection(supabase, "outlook");
  const email = user?.email ?? "—";

  let banner = calendar ? CALENDAR_MESSAGES[calendar] : undefined;
  if (banner && provider === "outlook" && calendar === "connected") {
    banner = { tone: "ok", text: "Outlook Calendar conectado e sincronizado." };
  } else if (banner && provider === "google" && calendar === "connected") {
    banner = { tone: "ok", text: "Google Calendar conectado e sincronizado." };
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Calendários, auto-join, transcripts nativos, retenção e notificações."
        meta="Conta"
      />

      {banner && (
        <div
          role="status"
          className={
            banner.tone === "ok"
              ? "mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
              : "mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          }
        >
          {banner.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conta</CardTitle>
            <CardDescription>E-mail da sessão atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">{email}</p>
            <AccountActions />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendários</CardTitle>
            <CardDescription>Google e Outlook — sync paralelo de reuniões</CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarConnections
              google={{
                connected: Boolean(googleConnection),
                email: googleConnection?.email ?? null,
                lastSyncedAt: googleConnection?.last_synced_at ?? null,
              }}
              outlook={{
                connected: Boolean(outlookConnection),
                email: outlookConnection?.email ?? null,
                lastSyncedAt: outlookConnection?.last_synced_at ?? null,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-join do bot</CardTitle>
            <CardDescription>
              ReuniAI entra automaticamente nas calls (exceto Teams/Meet com transcript nativo)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AutoJoinToggle initialEnabled={autoJoin} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacidade e dados</CardTitle>
            <CardDescription>Retenção automática e aparência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RetentionSettings initialDays={retentionDays} />
            <ThemeToggle />
          </CardContent>
        </Card>

        <NotificationSettings initialPrefs={notificationPrefs} />

        <LocaleAndTemplateSettings
          initialLocale={locale}
          initialDefaultTemplate={defaultTemplate}
        />
      </div>
    </div>
  );
}
