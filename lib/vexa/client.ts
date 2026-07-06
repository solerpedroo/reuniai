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

/** Entrada de `/bots/status` — status do container Docker, não do ciclo de vida da reunião. */
export type VexaRunningBot = {
  container_id?: string;
  container_name?: string;
  platform: BotPlatform;
  native_meeting_id: string;
  /** Uptime do container, ex.: "Up 4 seconds" — não confundir com `active`/`joining`. */
  status: string;
  normalized_status?: string;
  created_at?: string;
  meeting_id_from_name?: string;
};

export type VexaMeetingParticipant = {
  name: string;
  segment_count?: number;
  first_seen?: string;
  last_seen?: string;
  speaking_time_seconds?: number;
};

export type VexaMeetingParticipantsResponse = {
  id?: number;
  platform?: BotPlatform;
  native_meeting_id?: string;
  participant_count: number;
  participants?: VexaMeetingParticipant[];
};

export type CreateBotInput = {
  platform: BotPlatform;
  nativeMeetingId?: string;
  /** URL bruta — Vexa extrai id/passcode (Teams legacy / meetup-join). */
  meetingUrl?: string;
  botName?: string;
  language?: string;
  passcode?: string;
  voiceAgentEnabled?: boolean;
  /**
   * Pede para o bot inicializar a câmera ao entrar. Campo não documentado pela Vexa
   * (ignorado se não suportado); enviado como dica para a câmera virtual/avatar do
   * Meet — que é experimental. O avatar de fato é aplicado em applyBotBranding.
   */
  cameraEnabled?: boolean;
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
  if (!input.meetingUrl && !input.nativeMeetingId) {
    throw new Error("createBot exige nativeMeetingId ou meetingUrl.");
  }

  const voiceAgent = input.voiceAgentEnabled ?? true;
  const wantsCamera =
    input.cameraEnabled ??
    (input.platform === "google_meet" || input.platform === "zoom");

  const body: Record<string, unknown> = {
    platform: input.platform,
    bot_name: input.botName ?? formatBotDisplayName(null),
    language: input.language ?? "pt",
    recording_enabled: true,
    transcribe_enabled: true,
    transcription_tier: "realtime",
    voice_agent_enabled: voiceAgent,
    camera_enabled: wantsCamera,
  };

  if (input.meetingUrl) {
    body.meeting_url = input.meetingUrl;
  } else {
    body.native_meeting_id = input.nativeMeetingId;
    if (input.passcode) body.passcode = input.passcode;
  }

  const res = await vexaFetch("/bots", {
    method: "POST",
    body: JSON.stringify(body),
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
  absolute_start_time?: string;
  absolute_end_time?: string;
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

export async function getRunningBots(): Promise<VexaRunningBot[]> {
  const res = await vexaFetch("/bots/status");
  if (!res.ok) {
    throw new Error(`Vexa getRunningBots falhou: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { running_bots?: VexaRunningBot[] } | VexaRunningBot[];
  if (Array.isArray(data)) return data;
  return data.running_bots ?? [];
}

/** Lista reuniões do Vexa com status de ciclo de vida (`active`, `joining`, `completed`, …). */
export async function listVexaMeetings(limit = 250): Promise<VexaMeeting[]> {
  const res = await vexaFetch(`/meetings?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Vexa listVexaMeetings falhou: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { meetings?: VexaMeeting[] } | VexaMeeting[];
  if (Array.isArray(data)) return data;
  return data.meetings ?? [];
}

/** Busca reunião por plataforma + ID nativo (endpoint direto, fallback para listagem). */
export async function getVexaMeeting(
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<VexaMeeting | null> {
  const direct = await vexaFetch(`/meetings/${platform}/${encodeURIComponent(nativeMeetingId)}`);
  if (direct.ok) {
    return (await direct.json()) as VexaMeeting;
  }
  if (direct.status !== 404) {
    throw new Error(`Vexa getVexaMeeting falhou: ${direct.status} ${await direct.text()}`);
  }

  const meetings = await listVexaMeetings();
  return (
    meetings.find(
      (item) => item.platform === platform && item.native_meeting_id === nativeMeetingId
    ) ?? null
  );
}

/** Participantes detectados na reunião (via transcrição em tempo real). */
export async function getMeetingParticipants(
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<VexaMeetingParticipantsResponse> {
  const res = await vexaFetch(
    `/bots/${platform}/${encodeURIComponent(nativeMeetingId)}/participants`
  );
  if (!res.ok) {
    throw new Error(`Vexa getMeetingParticipants falhou: ${res.status} ${await res.text()}`);
  }
  return res.json();
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

export type VexaRecordingDownload = {
  download_url?: string;
  filename?: string;
  content_type?: string;
  file_size_bytes?: number;
};

/** Presigned URL para playback direto no browser (S3/MinIO). */
export async function fetchRecordingMediaDownload(
  recordingId: string,
  mediaFileId: string
): Promise<VexaRecordingDownload | null> {
  const res = await vexaFetch(
    `/recordings/${encodeURIComponent(recordingId)}/media/${encodeURIComponent(mediaFileId)}/download`
  );
  if (!res.ok) return null;
  return res.json() as Promise<VexaRecordingDownload>;
}

/** Verifica se a mídia ainda existe no Vexa (download ou raw parcial). */
export async function isVexaRecordingMediaAvailable(
  recordingId: string,
  mediaFileId: string
): Promise<boolean> {
  const download = await fetchRecordingMediaDownload(recordingId, mediaFileId);
  if (download?.download_url?.startsWith("http")) return true;

  const res = await fetchRecordingMediaRaw(recordingId, mediaFileId, { Range: "bytes=0-1" });
  return res.ok || res.status === 206;
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
