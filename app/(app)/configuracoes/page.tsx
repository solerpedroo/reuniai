import type { Profile } from "@/lib/supabase/types";
import { PageHeader } from "@/components/layout/page-header";
import { BotBrandingPreview } from "@/components/settings/bot-branding-preview";
import { AccountActions } from "@/components/settings/account-actions";
import { AutoJoinToggle } from "@/components/settings/auto-join-toggle";
import { CalendarConnections } from "@/components/settings/calendar-connections";
import { RetentionSettings } from "@/components/settings/retention-settings";
import { ExportDataButton } from "@/components/settings/export-data-button";
import Link from "next/link";
import { LinkSimple, Plugs } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocaleAndTemplateSettings } from "@/components/settings/locale-template-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { buildBotDisplayName } from "@/lib/brand/bot-name";
import { getCalendarConnection } from "@/lib/calendar/queries";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisTemplateId } from "@/lib/analysis/template-types";
import { parseTemplateId } from "@/lib/analysis/template-types";
import { parseUserLocale, type UserLocale } from "@/lib/profile/locale";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/profile/notification-prefs";
import { getEmailDeliveryStatus } from "@/lib/email/config";
import type { NotificationPrefs } from "@/lib/workflow/types";

const STATUS_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> = {
  connected: { tone: "ok", text: "Conectado com sucesso." },
  error: { tone: "error", text: "Não foi possível conectar. Tente novamente." },
  no_refresh: {
    tone: "error",
    text: "O provedor não retornou um token de atualização. Remova o acesso e tente novamente.",
  },
};

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
  searchParams: Promise<{ calendar?: string; provider?: string; slack?: string; notion?: string }>;
}) {
  const { calendar, provider, slack, notion } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let autoJoin = true;
  let retentionDays = 365;
  let notificationPrefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
  let locale: UserLocale = "pt-BR";
  let defaultTemplate: AnalysisTemplateId = "generic";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("auto_join_enabled, retention_days, notification_prefs, locale, default_analysis_template, display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const typed = profile as Pick<Profile, "auto_join_enabled" | "retention_days" | "display_name"> & {
        notification_prefs?: NotificationPrefs;
        locale?: string;
        default_analysis_template?: string;
      };
      displayName = typed.display_name;
      autoJoin = typed.auto_join_enabled;
      retentionDays = typed.retention_days;
      if (typed.notification_prefs) {
        notificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...typed.notification_prefs };
      }
      locale = parseUserLocale(typed.locale);
      defaultTemplate = parseTemplateId(typed.default_analysis_template);
    }
  }

  const googleConnection = await getCalendarConnection(supabase, "google");
  const outlookConnection = await getCalendarConnection(supabase, "outlook");
  const email = user?.email ?? "—";
  const metadata = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const botDisplayName = buildBotDisplayName({
    displayName,
    email: user?.email,
    metadataFullName: metadata?.full_name ?? metadata?.name,
  });

  let banner = calendar ? CALENDAR_MESSAGES[calendar] : undefined;
  if (banner && provider === "outlook" && calendar === "connected") {
    banner = { tone: "ok", text: "Outlook Calendar conectado e sincronizado." };
  } else if (banner && provider === "google" && calendar === "connected") {
    banner = { tone: "ok", text: "Google Calendar conectado e sincronizado." };
  }
  if (!banner && slack) {
    banner = {
      ...STATUS_MESSAGES[slack],
      text: slack === "connected" ? "Slack conectado." : STATUS_MESSAGES[slack].text,
    };
  }
  if (!banner && notion) {
    banner = {
      ...STATUS_MESSAGES[notion],
      text: notion === "connected" ? "Notion conectado." : STATUS_MESSAGES[notion].text,
    };
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
          <CardContent className="space-y-6">
            <AutoJoinToggle initialEnabled={autoJoin} />
            <BotBrandingPreview botDisplayName={botDisplayName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacidade e dados</CardTitle>
            <CardDescription>Retenção automática e aparência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RetentionSettings initialDays={retentionDays} />
            <ExportDataButton />
            <ThemeToggle />
          </CardContent>
        </Card>

        <NotificationSettings
          initialPrefs={notificationPrefs}
          emailStatus={getEmailDeliveryStatus()}
        />

        <LocaleAndTemplateSettings
          initialLocale={locale}
          initialDefaultTemplate={defaultTemplate}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkSimple size={18} aria-hidden />
              Links compartilhados
            </CardTitle>
            <CardDescription>URLs read-only — revogar ou copiar</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/compartilhar">Gerenciar links</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plugs size={18} aria-hidden />
              Integrações
            </CardTitle>
            <CardDescription>Slack, Notion e webhooks outbound</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/integracoes">Gerenciar integrações</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
