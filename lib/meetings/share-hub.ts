import "server-only";

import {
  formatSharePermissionsSummaryFriendly,
  parseSharePermissions,
  permissionsFromScope,
} from "@/lib/meetings/share-permissions";
import type { ShareLinkHubItem, ShareLinksHub, ShareLinkStatus } from "@/lib/meetings/share-hub-types";
import { maskShareToken } from "@/lib/meetings/share-hub-types";
import type { createClient } from "@/lib/supabase/server";
import type { ShareScope } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type { ShareLinkHubItem, ShareLinksHub, ShareLinkStatus } from "@/lib/meetings/share-hub-types";
export { maskShareToken } from "@/lib/meetings/share-hub-types";

function resolveStatus(
  expiresAt: string,
  revokedAt: string | null,
  now: Date
): ShareLinkStatus {
  if (revokedAt) return "revoked";
  if (new Date(expiresAt) <= now) return "expired";
  return "active";
}

export async function getShareLinksHub(
  supabase: Client,
  options: { includeInactive?: boolean } = {},
  now = new Date()
): Promise<ShareLinksHub> {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabase
    .from("share_tokens")
    .select("id, meeting_id, token, scope, expires_at, revoked_at, created_at, meetings(title)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!options.includeInactive) {
    query = query.is("revoked_at", null).gt("expires_at", now.toISOString());
  } else {
    query = query.or(
      `revoked_at.not.is.null,expires_at.lte.${now.toISOString()}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const { count: activeCount, error: countError } = await supabase
    .from("share_tokens")
    .select("*", { count: "exact", head: true })
    .is("revoked_at", null)
    .gt("expires_at", now.toISOString());

  if (countError) throw countError;

  type Row = {
    id: string;
    meeting_id: string;
    token: string;
    scope: ShareScope;
    permissions?: unknown;
    expires_at: string;
    revoked_at: string | null;
    created_at: string;
    meetings: { title: string } | { title: string }[] | null;
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const items: ShareLinkHubItem[] = (data ?? []).map((row) => {
    const typed = row as Row;
    const meeting = Array.isArray(typed.meetings) ? typed.meetings[0] : typed.meetings;
    const permissions = parseSharePermissions(
      typed.permissions ?? permissionsFromScope(typed.scope)
    );
    const status = resolveStatus(typed.expires_at, typed.revoked_at, now);

    return {
      id: typed.id,
      meetingId: typed.meeting_id,
      meetingTitle: meeting?.title ?? "Reunião",
      tokenSuffix: maskShareToken(typed.token),
      shareUrl: `${appUrl}/s/${typed.token}`,
      status,
      expiresAt: typed.expires_at,
      createdAt: typed.created_at,
      permissionsSummary: formatSharePermissionsSummaryFriendly(permissions),
    };
  });

  const filteredItems = options.includeInactive
    ? items.filter(
        (item) =>
          item.status !== "active" && new Date(item.createdAt) >= thirtyDaysAgo
      )
    : items;

  return {
    items: filteredItems,
    activeCount: activeCount ?? 0,
  };
}
