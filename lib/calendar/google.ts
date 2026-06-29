import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { decryptToken } from "@/lib/crypto/token-encrypt";
import { detectPlatform, findMeetingUrlInText } from "@/lib/calendar/platform";

type AdminClient = ReturnType<typeof createAdminClient>;

const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export const CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function getClientId(): string {
  const id = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CALENDAR_CLIENT_ID não configurado.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CALENDAR_CLIENT_SECRET não configurado.");
  return secret;
}

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
};

export async function exchangeCodeForTokens(
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
    throw new Error(`Falha ao trocar code por tokens: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao renovar access token: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function getGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao obter e-mail do Google: ${res.status}`);
  }
  const data = (await res.json()) as { email?: string };
  if (!data.email) throw new Error("Resposta de userinfo sem e-mail.");
  return data.email;
}

type GoogleEventDate = { dateTime?: string; date?: string };

type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  recurringEventId?: string;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
};

export async function listCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${EVENTS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Falha ao listar eventos: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { items?: GoogleEvent[]; nextPageToken?: string };
    if (data.items) events.push(...data.items);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
}

function extractMeetingUrl(event: GoogleEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink;

  const videoEntry = event.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video" && e.uri
  );
  if (videoEntry?.uri) return videoEntry.uri;

  return findMeetingUrlInText(event.location) ?? findMeetingUrlInText(event.description);
}

function getEventStart(event: GoogleEvent): string | null {
  if (event.start?.dateTime) return event.start.dateTime;
  if (event.start?.date) return new Date(`${event.start.date}T00:00:00`).toISOString();
  return null;
}

function getEventEnd(event: GoogleEvent): string | null {
  if (event.end?.dateTime) return event.end.dateTime;
  if (event.end?.date) return new Date(`${event.end.date}T00:00:00`).toISOString();
  return null;
}

export type SyncResult = {
  scanned: number;
  withLink: number;
  inserted: number;
  updated: number;
};

type ConnectionInput = {
  userId: string;
  connectionId: string;
  refreshTokenEncrypted: string;
};

export async function syncCalendarConnection(
  admin: AdminClient,
  connection: ConnectionInput
): Promise<SyncResult> {
  const refreshToken = decryptToken(connection.refreshTokenEncrypted);
  const accessToken = await refreshAccessToken(refreshToken);

  const now = Date.now();
  const timeMin = new Date(now - 30 * 86_400_000).toISOString();
  const timeMax = new Date(now + 7 * 86_400_000).toISOString();

  const events = await listCalendarEvents(accessToken, timeMin, timeMax);

  const candidates = events
    .filter((e) => e.status !== "cancelled")
    .map((event) => {
      const url = extractMeetingUrl(event);
      const startedAt = getEventStart(event);
      if (!url || !startedAt) return null;
      return { event, url, startedAt, endedAt: getEventEnd(event) };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const eventIds = candidates.map((c) => c.event.id);

  const existingByEventId = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: existing, error } = await admin
      .from("meetings")
      .select("id, calendar_event_id")
      .eq("user_id", connection.userId)
      .in("calendar_event_id", eventIds);

    if (error) throw error;
    for (const row of existing ?? []) {
      if (row.calendar_event_id) existingByEventId.set(row.calendar_event_id, row.id);
    }
  }

  const toInsert: TablesInsert<"meetings">[] = [];
  let updated = 0;

  for (const { event, url, startedAt, endedAt } of candidates) {
    const title = event.summary?.trim() || "Reunião sem título";
    const platform = detectPlatform(url);
    const existingId = existingByEventId.get(event.id);

    if (existingId) {
      // Atualiza apenas dados de agendamento; não mexe no status já processado.
      const { error } = await admin
        .from("meetings")
        .update({
          title,
          started_at: startedAt,
          ended_at: endedAt,
          platform,
          meeting_url: url,
          calendar_recurring_event_id: event.recurringEventId ?? null,
        })
        .eq("id", existingId);
      if (error) throw error;
      updated += 1;
    } else {
      toInsert.push({
        user_id: connection.userId,
        calendar_event_id: event.id,
        calendar_recurring_event_id: event.recurringEventId ?? null,
        title,
        started_at: startedAt,
        ended_at: endedAt,
        platform,
        meeting_url: url,
        status: "scheduled",
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await admin.from("meetings").insert(toInsert);
    if (error) throw error;
  }

  await admin
    .from("calendar_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.connectionId);

  return {
    scanned: events.length,
    withLink: candidates.length,
    inserted: toInsert.length,
    updated,
  };
}
