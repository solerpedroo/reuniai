import type { MeetingStatus } from "@/lib/supabase/types";
import type { MeetingSessionStatus } from "@/lib/vexa/session-types";

/** Bot Vexa ainda pode estar na call. */
export const BOT_ACTIVE_STATUSES = new Set<MeetingStatus>(["bot_joining", "recording"]);

/** Pipeline pós-reunião (sem bot na call). */
export const PIPELINE_ACTIVE_STATUSES = new Set<MeetingStatus>(["processing"]);

/** Estados que exigem atualização periódica na UI. */
export const UI_REFRESH_STATUSES = new Set<MeetingStatus>([
  "bot_joining",
  "recording",
  "processing",
]);

export type BotUiPhase =
  | "idle"
  | "joining"
  | "in_call"
  | "recording"
  | "stopping"
  | "processing"
  | "failed"
  | "partial"
  | "done";

const LIVE_STEP_LABELS = ["Entrando", "Na reunião", "Gravando", "Processando"] as const;

/** Fase exibida na UI — combina status do DB com telemetria ao vivo do Vexa. */
export function deriveBotUiPhase(
  dbStatus: MeetingStatus,
  session?: MeetingSessionStatus | null
): BotUiPhase {
  switch (dbStatus) {
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    case "partial":
      return "partial";
    case "completed":
    case "cancelled":
      return "done";
    case "scheduled":
      return "idle";
    case "recording":
      if (session?.vexaStatus === "stopping") return "stopping";
      if (session && !session.connected) return "stopping";
      return "recording";
    case "bot_joining":
      if (!session) return "joining";
      if (session.vexaStatus === "stopping") return "stopping";
      if (!session.connected) return "joining";
      if (
        session.recording.capturing ||
        session.vexaStatus === "active" ||
        session.vexaStatus === "stopping"
      ) {
        return "recording";
      }
      return "in_call";
    default:
      return "idle";
  }
}

export function getLiveStepIndex(phase: BotUiPhase): number {
  switch (phase) {
    case "joining":
      return 0;
    case "in_call":
      return 1;
    case "recording":
    case "stopping":
      return 2;
    case "processing":
      return 3;
    default:
      return -1;
  }
}

export function getLiveStepLabels(): readonly string[] {
  return LIVE_STEP_LABELS;
}

export function getPhaseBannerMessage(phase: BotUiPhase): string {
  switch (phase) {
    case "joining":
      return "O bot está entrando na reunião…";
    case "in_call":
      return "O bot entrou na reunião e aguarda início da gravação.";
    case "recording":
      return "O bot está gravando e transcrevendo esta reunião.";
    case "stopping":
      return "O bot está encerrando a gravação…";
    case "processing":
      return "Processando transcrição e análise por IA…";
    case "failed":
      return "Falha no processamento desta reunião.";
    case "partial":
      return "Transcrição parcial disponível.";
    default:
      return "";
  }
}

export function shouldShowLiveSessionBadges(phase: BotUiPhase): boolean {
  return phase === "joining" || phase === "in_call" || phase === "recording" || phase === "stopping";
}

export function canStopBot(
  status: MeetingStatus,
  recallBotId: string | null | undefined,
  preferNativeTranscript?: boolean | null
): boolean {
  if (preferNativeTranscript) return false;
  if (!recallBotId) return false;
  return BOT_ACTIVE_STATUSES.has(status);
}

export function canSendBot(
  status: MeetingStatus,
  preferNativeTranscript?: boolean | null
): boolean {
  if (preferNativeTranscript) return false;
  return status === "scheduled" || status === "failed";
}

export function shouldPollBotSession(
  status: MeetingStatus,
  recallBotId: string | null | undefined
): boolean {
  return Boolean(recallBotId) && BOT_ACTIVE_STATUSES.has(status);
}
