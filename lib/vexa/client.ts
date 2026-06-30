import "server-only";

import { formatBotDisplayName } from "@/lib/brand/bot-name";
import type { BotPlatform } from "@/lib/meetings/meeting-url";

function getConfig() {
  const base = process.env.VEXA_API_BASE ?? "https://api.cloud.vexa.ai";
  const apiKey = process.env.VEXA_API_KEY;
  if (!apiKey) throw new Error("VEXA_API_KEY não configurada.");
  return { base: base.replace(/\/$/, ""), apiKey };
}

async function vexaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { base, apiKey } = getConfig();
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...init.headers,
    },
    cache: "no-store",
  });
}

export type VexaMeeting = {
  id: number;
  platform: BotPlatform;
  native_meeting_id: string;
  constructed_meeting_url?: string | null;
  status: string;
  start_time?: string | null;
  end_time?: string | null;
  data?: Record<string, unknown> | null;
};

export type CreateBotInput = {
  platform: BotPlatform;
  nativeMeetingId: string;
  botName?: string;
  language?: string;
  passcode?: string;
  voiceAgentEnabled?: boolean;
};

export type SetBotAvatarInput = {
  url?: string;
  imageBase64?: string;
};

export type SetBotScreenInput = {
  type: "image" | "url" | "video" | "html";
  url?: string;
  imageBase64?: string;
  html?: string;
};

export async function createBot(input: CreateBotInput): Promise<VexaMeeting> {
  const res = await vexaFetch("/bots", {
    method: "POST",
    body: JSON.stringify({
      platform: input.platform,
      native_meeting_id: input.nativeMeetingId,
      bot_name: input.botName ?? formatBotDisplayName(null),
      language: input.language ?? "pt",
      passcode: input.passcode,
      recording_enabled: true,
      transcribe_enabled: true,
      transcription_tier: "realtime",
      voice_agent_enabled: input.voiceAgentEnabled ?? true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Vexa createBot falhou: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function stopBot(platform: BotPlatform, nativeMeetingId: string): Promise<void> {
  const res = await vexaFetch(`/bots/${platform}/${nativeMeetingId}`, { method: "DELETE" });
  // 202 esperado; 404 = bot já não existe (idempotente).
  if (!res.ok && res.status !== 404) {
    throw new Error(`Vexa stopBot falhou: ${res.status} ${await res.text()}`);
  }
}

export type VexaTranscriptSegment = {
  start?: number;
  end?: number;
  speaker?: string;
  text: string;
  language?: string;
};

export type VexaRecordingMediaFile = {
  id?: string | number;
  type?: string;
  format?: string;
  duration_seconds?: number;
};

export type VexaRecordingSummary = {
  id?: string | number;
  status?: string;
  media_files?: VexaRecordingMediaFile[];
};

export type VexaTranscriptResponse = {
  segments?: VexaTranscriptSegment[];
  recordings?: VexaRecordingSummary[];
  status?: string;
};

export async function getTranscript(
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<VexaTranscriptResponse> {
  const res = await vexaFetch(`/transcripts/${platform}/${nativeMeetingId}`);
  if (!res.ok) {
    throw new Error(`Vexa getTranscript falhou: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getRunningBots(): Promise<VexaMeeting[]> {
  const res = await vexaFetch("/bots/status");
  if (!res.ok) {
    throw new Error(`Vexa getRunningBots falhou: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { running_bots?: VexaMeeting[] } | VexaMeeting[];
  if (Array.isArray(data)) return data;
  return data.running_bots ?? [];
}

/** Câmera virtual do bot (experimental no Meet; mais confiável no Zoom). */
export async function setBotAvatar(
  platform: BotPlatform,
  nativeMeetingId: string,
  input: SetBotAvatarInput
): Promise<void> {
  const body: Record<string, string> = {};
  if (input.url) body.url = input.url;
  if (input.imageBase64) body.image_base64 = input.imageBase64;
  if (!body.url && !body.image_base64) {
    throw new Error("setBotAvatar requer url ou imageBase64.");
  }

  const res = await vexaFetch(`/bots/${platform}/${nativeMeetingId}/avatar`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Vexa setBotAvatar falhou: ${res.status} ${await res.text()}`);
  }
}

/** Compartilhamento de tela com fundo personalizado (fallback quando avatar não suportado). */
export async function setBotScreen(
  platform: BotPlatform,
  nativeMeetingId: string,
  input: SetBotScreenInput
): Promise<void> {
  const body: Record<string, string> = { type: input.type };
  if (input.url) body.url = input.url;
  if (input.imageBase64) body.image_base64 = input.imageBase64;
  if (input.html) body.html = input.html;

  const res = await vexaFetch(`/bots/${platform}/${nativeMeetingId}/screen`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Vexa setBotScreen falhou: ${res.status} ${await res.text()}`);
  }
}

/** Stream autenticado de mídia (suporta Range para seek no player). */
export async function fetchRecordingMediaRaw(
  recordingId: string,
  mediaFileId: string,
  requestHeaders?: HeadersInit
): Promise<Response> {
  const { base, apiKey } = getConfig();
  const headers = new Headers(requestHeaders);
  headers.set("X-API-Key", apiKey);

  return fetch(`${base}/recordings/${encodeURIComponent(recordingId)}/media/${encodeURIComponent(mediaFileId)}/raw`, {
    headers,
    cache: "no-store",
  });
}

export async function setUserWebhook(webhookUrl: string, webhookSecret?: string): Promise<void> {
  const res = await vexaFetch("/user/webhook", {
    method: "PUT",
    body: JSON.stringify({ webhook_url: webhookUrl, webhook_secret: webhookSecret }),
  });
  if (!res.ok) {
    throw new Error(`Vexa setUserWebhook falhou: ${res.status} ${await res.text()}`);
  }
}
