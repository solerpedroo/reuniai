import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto/token-encrypt";
import { findMeetingUrlInText } from "@/lib/calendar/platform";
import {
  type CalendarMeetingCandidate,
  upsertMeetingsFromCalendar,
  type SyncResult,
} from "@/lib/calendar/sync-meetings";

type AdminClient = ReturnType<typeof createAdminClient>;

const OAUTH_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const OAUTH_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export const OUTLOOK_CALENDAR_SCOPES = [
  "openid",
  "email",
  "offline_access",
  "User.Read",
  "Calendars.Read",
  "OnlineMeetings.Read",
];

function getClientId(): string {
  const id = process.env.MICROSOFT_CLIENT_ID;
  if (!id) throw new Error("MICROSOFT_CLIENT_ID não configurado.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!secret) throw new Error("MICROSOFT_CLIENT_SECRET não configurado.");
  return secret;
}

export function buildOutlookAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OUTLOOK_CALENDAR_SCOPES.join(" "),
    response_mode: "query",
    state,
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export async function exchangeOutlookCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao trocar code Outlook: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshOutlookAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
      scope: OUTLOOK_CALENDAR_SCOPES.join(" "),
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao renovar token Outlook: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function getOutlookEmail(accessToken: string): Promise<string> {
  const res = await graphFetch(accessToken, "/me?$select=mail,userPrincipalName");
  if (!res.ok) throw new Error(`Falha ao obter e-mail Outlook: ${res.status}`);
  const data = (await res.json()) as { mail?: string; userPrincipalName?: string };
  const email = data.mail ?? data.userPrincipalName;
  if (!email) throw new Error("Resposta Graph sem e-mail.");
  return email;
}

async function graphFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
}

type OutlookEvent = {
  id: string;
  subject?: string;
  body?: { content?: string };
  location?: { displayName?: string };
  start?: { dateTime: string };
  end?: { dateTime: string };
  isCancelled?: boolean;
  seriesMasterId?: string;
  onlineMeeting?: { joinUrl?: string };
  attendees?: {
    emailAddress?: { address?: string; name?: string };
    status?: { response?: string };
  }[];
};

export async function listOutlookCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<OutlookEvent[]> {
  const events: OutlookEvent[] = [];
  let nextLink: string | undefined =
    `${GRAPH_BASE}/me/calendarView?startDateTime=${encodeURIComponent(timeMin)}&endDateTime=${encodeURIComponent(timeMax)}&$top=250&$select=id,subject,body,location,start,end,isCancelled,seriesMasterId,onlineMeeting,attendees`;

  while (nextLink) {
    const res = await fetch(nextLink, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Falha ao listar eventos Outlook: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { value?: OutlookEvent[]; "@odata.nextLink"?: string };
    if (data.value) events.push(...data.value);
    nextLink = data["@odata.nextLink"];
  }

  return events;
}

export async function resolveTeamsOnlineMeetingId(
  accessToken: string,
  joinUrl: string
): Promise<string | null> {
  const filter = encodeURIComponent(`JoinWebUrl eq '${joinUrl.replace(/'/g, "''")}'`);
  const res = await graphFetch(accessToken, `/me/onlineMeetings?$filter=${filter}&$select=id`);
  if (!res.ok) return null;
  const data = (await res.json()) as { value?: { id?: string }[] };
  return data.value?.[0]?.id ?? null;
}

function extractMeetingUrl(event: OutlookEvent): string | null {
  if (event.onlineMeeting?.joinUrl) return event.onlineMeeting.joinUrl;
  return (
    findMeetingUrlInText(event.location?.displayName) ??
    findMeetingUrlInText(event.body?.content)
  );
}

function toIsoDateTime(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

type ConnectionInput = {
  userId: string;
  connectionId: string;
  refreshTokenEncrypted: string;
};

export async function syncOutlookCalendarConnection(
  admin: AdminClient,
  connection: ConnectionInput
): Promise<SyncResult> {
  const refreshToken = decryptToken(connection.refreshTokenEncrypted);
  const accessToken = await refreshOutlookAccessToken(refreshToken);

  const now = Date.now();
  const timeMin = new Date(now - 30 * 86_400_000).toISOString();
  const timeMax = new Date(now + 7 * 86_400_000).toISOString();

  const events = await listOutlookCalendarEvents(accessToken, timeMin, timeMax);

  const candidates: CalendarMeetingCandidate[] = [];

  for (const event of events) {
    if (event.isCancelled) continue;
    const url = extractMeetingUrl(event);
    const startedAt = toIsoDateTime(event.start?.dateTime);
    if (!url || !startedAt) continue;

    const isTeams = url.includes("teams.microsoft.com") || url.includes("teams.live.com");
    let nativeArtifactId: string | null = null;
    if (isTeams && event.onlineMeeting?.joinUrl) {
      nativeArtifactId = await resolveTeamsOnlineMeetingId(accessToken, event.onlineMeeting.joinUrl);
    }

    candidates.push({
      calendarEventId: event.id,
      recurringEventId: event.seriesMasterId ?? null,
      title: event.subject?.trim() || "Reunião sem título",
      url,
      startedAt,
      endedAt: toIsoDateTime(event.end?.dateTime),
      nativeArtifactId,
      preferNativeTranscript: isTeams && Boolean(nativeArtifactId),
      attendees: (event.attendees ?? [])
        .filter((a) => a.status?.response !== "declined")
        .map((attendee) => ({
          name:
            attendee.emailAddress?.name?.trim() ||
            attendee.emailAddress?.address?.split("@")[0] ||
            "Participante",
          email: attendee.emailAddress?.address ?? null,
        })),
    });
  }

  return upsertMeetingsFromCalendar(
    admin,
    { userId: connection.userId, connectionId: connection.connectionId },
    events.length,
    candidates
  );
}

export type { SyncResult };
