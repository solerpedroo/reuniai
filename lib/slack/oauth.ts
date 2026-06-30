import "server-only";

const SLACK_OAUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

export const SLACK_SCOPES = [
  "channels:read",
  "chat:write",
  "groups:read",
  "incoming-webhook",
].join(",");

function getClientId(): string {
  const id = process.env.SLACK_CLIENT_ID;
  if (!id) throw new Error("SLACK_CLIENT_ID não configurado.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.SLACK_CLIENT_SECRET;
  if (!secret) throw new Error("SLACK_CLIENT_SECRET não configurado.");
  return secret;
}

export function buildSlackAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    scope: SLACK_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `${SLACK_OAUTH_URL}?${params.toString()}`;
}

type SlackOAuthResponse = {
  ok: boolean;
  access_token?: string;
  team?: { id?: string; name?: string };
  incoming_webhook?: { channel_id?: string; channel?: string };
  error?: string;
};

export async function exchangeSlackCode(
  code: string,
  redirectUri: string
): Promise<{
  botToken: string;
  teamId: string;
  teamName: string | null;
  channelId: string | null;
  channelName: string | null;
}> {
  const res = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok || !data.access_token || !data.team?.id) {
    throw new Error(data.error ?? "Falha ao trocar code Slack.");
  }

  return {
    botToken: data.access_token,
    teamId: data.team.id,
    teamName: data.team.name ?? null,
    channelId: data.incoming_webhook?.channel_id ?? null,
    channelName: data.incoming_webhook?.channel ?? null,
  };
}

export async function listSlackChannels(botToken: string): Promise<
  { id: string; name: string }[]
> {
  const res = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200", {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const data = (await res.json()) as {
    ok: boolean;
    channels?: { id: string; name: string; is_member?: boolean }[];
  };
  if (!data.ok || !data.channels) return [];
  return data.channels
    .filter((c) => c.is_member)
    .map((c) => ({ id: c.id, name: c.name }));
}

export async function postSlackMessage(
  botToken: string,
  channelId: string,
  blocks: unknown[],
  text: string
): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: channelId, blocks, text }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(data.error ?? "Falha ao postar no Slack.");
}
