import type { Icon } from "@phosphor-icons/react";
import type { Profile } from "@/lib/supabase/types";
import {
  CalendarBlank,
  ClockCounterClockwise,
  Robot,
  User,
} from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { AccountActions } from "@/components/settings/account-actions";
import { AutoJoinToggle } from "@/components/settings/auto-join-toggle";
import { CalendarConnection } from "@/components/settings/calendar-connection";
import { RetentionSettings } from "@/components/settings/retention-settings";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { getCalendarConnection } from "@/lib/calendar/queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const CALENDAR_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> = {
  connected: { tone: "ok", text: "Google Calendar conectado e sincronizado." },
  error: { tone: "error", text: "Não foi possível conectar o Google Calendar. Tente novamente." },
  no_refresh: {
    tone: "error",
    text: "O Google não retornou um token de atualização. Remova o acesso do app na sua conta Google e tente novamente.",
  },
};

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: Icon;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-card overflow-hidden", className)}>
      <div className="flex items-start gap-3 border-b border-border/70 px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon size={18} weight="duotone" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

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

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("auto_join_enabled, retention_days")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const typed = profile as Pick<Profile, "auto_join_enabled" | "retention_days">;
      autoJoin = typed.auto_join_enabled;
      retentionDays = typed.retention_days;
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
              ? "mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
              : "mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          }
        >
          {banner.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <SettingsSection icon={User} title="Conta" description="E-mail da sessão atual">
          <div className="space-y-4">
            <p className="text-sm font-medium">{email}</p>
            <AccountActions />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={CalendarBlank}
          title="Google Calendar"
          description="Conectar calendário para sync automático"
        >
          <CalendarConnection
            connected={Boolean(connection)}
            email={connection?.email ?? null}
            lastSyncedAt={connection?.last_synced_at ?? null}
          />
        </SettingsSection>

        <SettingsSection
          icon={Robot}
          title="Auto-join do bot"
          description="ReuniAI entra automaticamente nas calls agendadas"
        >
          <AutoJoinToggle initialEnabled={autoJoin} />
        </SettingsSection>

        <SettingsSection
          icon={ClockCounterClockwise}
          title="Privacidade e dados"
          description="Retenção automática e aparência"
        >
          <div className="space-y-6">
            <RetentionSettings initialDays={retentionDays} />
            <ThemeToggle />
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
