import "server-only";

import { encryptToken, decryptToken } from "@/lib/crypto/token-encrypt";

const TODOIST_AUTH_URL = "https://todoist.com/oauth/authorize";
const TODOIST_TOKEN_URL = "https://todoist.com/oauth/access_token";
const TODOIST_API = "https://api.todoist.com/rest/v2";

function getClientId(): string {
  const id = process.env.TODOIST_CLIENT_ID;
  if (!id) throw new Error("TODOIST_CLIENT_ID não configurado.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.TODOIST_CLIENT_SECRET;
  if (!secret) throw new Error("TODOIST_CLIENT_SECRET não configurado.");
  return secret;
}

export function buildTodoistAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    scope: "data:read_write",
    state,
  });
  return `${TODOIST_AUTH_URL}?${params.toString()}`;
}

export async function exchangeTodoistCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string }> {
  const res = await fetch(TODOIST_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao trocar code Todoist: ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Todoist não retornou access_token.");
  return { accessToken: data.access_token };
}

export async function fetchTodoistUser(accessToken: string): Promise<string | null> {
  const res = await fetch(`${TODOIST_API}/projects`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return "Todoist";
}

export async function createTodoistTask(
  accessTokenEncrypted: string,
  input: { title: string; dueDate?: string | null; description?: string }
): Promise<string> {
  const accessToken = decryptToken(accessTokenEncrypted);
  const body: Record<string, unknown> = { content: input.title };
  if (input.dueDate) body.due_date = input.dueDate;
  if (input.description) body.description = input.description;

  const res = await fetch(`${TODOIST_API}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar task Todoist: ${res.status}`);
  }

  const data = (await res.json()) as { id: string };
  return String(data.id);
}

export async function updateTodoistTask(
  accessTokenEncrypted: string,
  externalId: string,
  input: { title?: string; dueDate?: string | null; completed?: boolean }
): Promise<void> {
  const accessToken = decryptToken(accessTokenEncrypted);

  if (input.completed) {
    const closeRes = await fetch(`${TODOIST_API}/tasks/${externalId}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!closeRes.ok && closeRes.status !== 404) {
      throw new Error(`Falha ao fechar task Todoist: ${closeRes.status}`);
    }
    return;
  }

  const body: Record<string, unknown> = {};
  if (input.title) body.content = input.title;
  if (input.dueDate !== undefined) body.due_date = input.dueDate;

  if (Object.keys(body).length === 0) return;

  const res = await fetch(`${TODOIST_API}/tasks/${externalId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Falha ao atualizar task Todoist: ${res.status}`);
  }
}

export async function getTodoistTaskStatus(
  accessTokenEncrypted: string,
  externalId: string
): Promise<"open" | "done" | null> {
  const accessToken = decryptToken(accessTokenEncrypted);
  const res = await fetch(`${TODOIST_API}/tasks/${externalId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao buscar task Todoist: ${res.status}`);

  const data = (await res.json()) as { is_completed?: boolean };
  return data.is_completed ? "done" : "open";
}

export { encryptToken };
