import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { RedactionAudit } from "@/lib/privacy/redact";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function logExportAudit(
  admin: AdminClient,
  input: {
    userId: string;
    meetingId: string;
    format: string;
    audit: RedactionAudit;
    shareTokenId?: string | null;
  }
): Promise<void> {
  const row: Database["public"]["Tables"]["export_audit"]["Insert"] = {
    user_id: input.userId,
    meeting_id: input.meetingId,
    share_token_id: input.shareTokenId ?? null,
    format: input.format,
    redaction_count: input.audit.count,
    redaction_types: input.audit.types,
  };

  const { error } = await admin.from("export_audit").insert(row);
  if (error) console.error("Falha ao registrar export_audit:", error);
}
