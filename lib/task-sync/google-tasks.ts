import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto/token-encrypt";
import { refreshAccessToken } from "@/lib/calendar/google";

type AdminClient = ReturnType<typeof createAdminClient>;

const TASKS_API = "https://tasks.googleapis.com/tasks/v1";
export const GOOGLE_TASKS_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/tasks",
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

export function buildGoogleTasksAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_TASKS_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleTasksCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string | null }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
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

  if (!res.ok) throw new Error(`Falha OAuth Google Tasks: ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
  };
}

async function getAccessToken(
  admin: AdminClient,
  userId: string,
  accessEncrypted: string | null,
  refreshEncrypted: string | null
): Promise<string> {
  if (refreshEncrypted) {
    const refresh = decryptToken(refreshEncrypted);
    return refreshAccessToken(refresh);
  }
  if (accessEncrypted) return decryptToken(accessEncrypted);
  throw new Error("Google Tasks sem tokens válidos.");
}

async function getDefaultTaskListId(accessToken: string): Promise<string> {
  const res = await fetch(`${TASKS_API}/users/@me/lists`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Falha ao listar task lists: ${res.status}`);
  const data = (await res.json()) as { items?: { id: string }[] };
  const listId = data.items?.[0]?.id;
  if (!listId) throw new Error("Nenhuma task list Google encontrada.");
  return listId;
}

export async function createGoogleTask(
  admin: AdminClient,
  userId: string,
  accessEncrypted: string | null,
  refreshEncrypted: string | null,
  config: Record<string, unknown>,
  input: { title: string; dueDate?: string | null; notes?: string }
): Promise<string> {
  const accessToken = await getAccessToken(admin, userId, accessEncrypted, refreshEncrypted);
  const listId = (config.task_list_id as string | undefined) ?? (await getDefaultTaskListId(accessToken));

  const body: Record<string, unknown> = { title: input.title };
  if (input.notes) body.notes = input.notes;
  if (input.dueDate) body.due = `${input.dueDate}T00:00:00.000Z`;

  const res = await fetch(`${TASKS_API}/lists/${listId}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Falha ao criar Google Task: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function updateGoogleTask(
  admin: AdminClient,
  userId: string,
  accessEncrypted: string | null,
  refreshEncrypted: string | null,
  config: Record<string, unknown>,
  externalId: string,
  input: { title?: string; dueDate?: string | null; completed?: boolean }
): Promise<void> {
  const accessToken = await getAccessToken(admin, userId, accessEncrypted, refreshEncrypted);
  const listId = (config.task_list_id as string | undefined) ?? (await getDefaultTaskListId(accessToken));

  const body: Record<string, unknown> = {};
  if (input.title) body.title = input.title;
  if (input.dueDate !== undefined) {
    body.due = input.dueDate ? `${input.dueDate}T00:00:00.000Z` : null;
  }
  if (input.completed !== undefined) body.status = input.completed ? "completed" : "needsAction";

  const res = await fetch(`${TASKS_API}/lists/${listId}/tasks/${externalId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Falha ao atualizar Google Task: ${res.status}`);
  }
}

export async function getGoogleTaskStatus(
  admin: AdminClient,
  userId: string,
  accessEncrypted: string | null,
  refreshEncrypted: string | null,
  config: Record<string, unknown>,
  externalId: string
): Promise<"open" | "done" | null> {
  const accessToken = await getAccessToken(admin, userId, accessEncrypted, refreshEncrypted);
  const listId = (config.task_list_id as string | undefined) ?? (await getDefaultTaskListId(accessToken));

  const res = await fetch(`${TASKS_API}/lists/${listId}/tasks/${externalId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao buscar Google Task: ${res.status}`);

  const data = (await res.json()) as { status?: string };
  return data.status === "completed" ? "done" : "open";
}
