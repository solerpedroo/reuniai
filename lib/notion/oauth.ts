import "server-only";

const NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";
const NOTION_VERSION = "2022-06-28";

function getClientId(): string {
  const id = process.env.NOTION_CLIENT_ID;
  if (!id) throw new Error("NOTION_CLIENT_ID não configurado.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.NOTION_CLIENT_SECRET;
  if (!secret) throw new Error("NOTION_CLIENT_SECRET não configurado.");
  return secret;
}

export function buildNotionAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
    state,
  });
  return `${NOTION_AUTH_URL}?${params.toString()}`;
}

export async function exchangeNotionCode(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  workspaceId: string;
  workspaceName: string | null;
}> {
  const credentials = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64");

  const res = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao trocar code Notion: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    workspace_id?: string;
    workspace_name?: string;
  };

  if (!data.access_token || !data.workspace_id) {
    throw new Error("Resposta Notion OAuth incompleta.");
  }

  return {
    accessToken: data.access_token,
    workspaceId: data.workspace_id,
    workspaceName: data.workspace_name ?? null,
  };
}

export async function notionFetch(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
