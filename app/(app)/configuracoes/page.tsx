import type { Profile } from "@/lib/supabase/types";
import { PageHeader } from "@/components/layout/page-header";
import { AccountActions } from "@/components/settings/account-actions";
import { AutoJoinToggle } from "@/components/settings/auto-join-toggle";
import { CalendarConnection } from "@/components/settings/calendar-connection";
import { RetentionSettings } from "@/components/settings/retention-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCalendarConnection } from "@/lib/calendar/queries";
import { createClient } from "@/lib/supabase/server";
import type { NotificationPrefs } from "@/lib/workflow/types";

const CALENDAR_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> = {
  connected: { tone: "ok", text: "Google Calendar conectado e sincronizado." },
  error: { tone: "error", text: "Não foi possível conectar o Google Calendar. Tente novamente." },
  no_refresh: {
    tone: "error",
    text: "O Google não retornou um token de atualização. Remova o acesso do app na sua conta Google e tente novamente.",
  },
};

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>;
}) {
  const { calendar } = await searchParams;
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

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("auto_join_enabled, retention_days, notification_prefs")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const typed = profile as Pick<Profile, "auto_join_enabled" | "retention_days"> & {
        notification_prefs?: NotificationPrefs;
      };
      autoJoin = typed.auto_join_enabled;
      retentionDays = typed.retention_days;
      if (typed.notification_prefs) notificationPrefs = typed.notification_prefs;
    }
  }

  const connection = await getCalendarConnection(supabase);
  const email = user?.email ?? "—";
  const banner = calendar ? CALENDAR_MESSAGES[calendar] : undefined;

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Calendário, regras de auto-join, retenção de dados e conta."
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
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>Conectar calendário para sync automático</CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarConnection
              connected={Boolean(connection)}
              email={connection?.email ?? null}
              lastSyncedAt={connection?.last_synced_at ?? null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-join do bot</CardTitle>
            <CardDescription>ReuniAI entra automaticamente nas calls agendadas</CardDescription>
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
      </div>
    </div>
  );
}
