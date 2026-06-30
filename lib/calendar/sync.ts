import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { CalendarProvider } from "@/lib/supabase/types";
import { syncCalendarConnection } from "@/lib/calendar/google";
import { syncOutlookCalendarConnection } from "@/lib/calendar/outlook";
import type { SyncResult } from "@/lib/calendar/sync-meetings";

type AdminClient = ReturnType<typeof createAdminClient>;

type ConnectionInput = {
  userId: string;
  connectionId: string;
  refreshTokenEncrypted: string;
  provider: CalendarProvider;
};

export async function syncCalendarConnectionByProvider(
  admin: AdminClient,
  connection: ConnectionInput
): Promise<SyncResult> {
  const base = {
    userId: connection.userId,
    connectionId: connection.connectionId,
    refreshTokenEncrypted: connection.refreshTokenEncrypted,
  };

  if (connection.provider === "outlook") {
    return syncOutlookCalendarConnection(admin, base);
  }
  return syncCalendarConnection(admin, base);
}
