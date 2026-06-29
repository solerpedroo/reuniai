import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklyDigestEmail } from "@/lib/email/weekly-digest";

type AdminClient = ReturnType<typeof createAdminClient>;

function isSunday8AmInTimezone(now: Date, timezone: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
      weekday: "short",
    }).formatToParts(now);

    const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "-1", 10);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    return weekday === "Sun" && hour === 8;
  } catch {
    return false;
  }
}

function shouldSendDigest(lastSentAt: string | null, now: Date): boolean {
  if (!lastSentAt) return true;
  const last = new Date(lastSentAt).getTime();
  const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
  return now.getTime() - last >= sixDaysMs;
}

export async function runWeeklyDigestCron(admin: AdminClient): Promise<{ sent: number }> {
  const now = new Date();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, timezone, last_weekly_digest_at");

  if (error) throw error;

  let sent = 0;
  for (const row of profiles ?? []) {
    const profile = row as {
      id: string;
      timezone: string | null;
      last_weekly_digest_at: string | null;
    };

    const timezone = profile.timezone ?? "America/Sao_Paulo";
    if (!isSunday8AmInTimezone(now, timezone)) continue;
    if (!shouldSendDigest(profile.last_weekly_digest_at, now)) continue;

    try {
      const ok = await sendWeeklyDigestEmail(admin, profile.id);
      if (ok) sent += 1;
    } catch (err) {
      console.error(`Falha no digest semanal para ${profile.id}:`, err);
    }
  }

  return { sent };
}
