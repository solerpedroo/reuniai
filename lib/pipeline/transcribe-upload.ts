import "server-only";

import type { NormalizedSegment } from "@/lib/pipeline/ingest-segments";

type WhisperSegment = {
  start?: number;
  end?: number;
  text?: string;
};

type WhisperVerboseResponse = {
  text?: string;
  segments?: WhisperSegment[];
};

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function isTranscriptionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY);
}

function mapWhisperSegments(data: WhisperVerboseResponse): NormalizedSegment[] {
  if (data.segments && data.segments.length > 0) {
    return data.segments
      .map((segment, index) => {
        const text = segment.text?.trim() ?? "";
        if (!text) return null;
        const startMs = Math.round((segment.start ?? 0) * 1000);
        const endMs = Math.round((segment.end ?? segment.start ?? 0) * 1000);
        return {
          speaker: `Participante ${index + 1}`,
          text,
          startMs,
          endMs: endMs > startMs ? endMs : startMs + 1000,
        };
      })
      .filter((row): row is NormalizedSegment => row !== null);
  }

  const text = data.text?.trim();
  if (!text) return [];

  return [{ speaker: "Participante", text, startMs: 0, endMs: 60_000 }];
}

async function transcribeWithProvider(
  buffer: Buffer,
  filename: string,
  provider: "openai" | "groq"
): Promise<NormalizedSegment[]> {
  const apiKey = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error(`Chave ausente para ${provider}.`);

  const baseUrl =
    provider === "openai" ? "https://api.openai.com/v1" : "https://api.groq.com/openai/v1";
  const model = provider === "openai" ? "whisper-1" : "whisper-large-v3-turbo";

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)]), filename);
  formData.append("model", model);
  formData.append("response_format", "verbose_json");
  formData.append("language", "pt");

  const res = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Transcrição falhou (${provider}): ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as WhisperVerboseResponse;
  const segments = mapWhisperSegments(data);
  if (segments.length === 0) {
    throw new Error("Transcrição retornou vazia.");
  }
  return segments;
}

/** Transcreve áudio/vídeo enviado pelo usuário via Whisper (OpenAI ou Groq). */
export async function transcribeUploadedAudio(
  buffer: Buffer,
  filename: string
): Promise<NormalizedSegment[]> {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error("Arquivo excede 25 MB. Comprima ou divida a gravação.");
  }

  if (process.env.OPENAI_API_KEY) {
    return transcribeWithProvider(buffer, filename, "openai");
  }
  if (process.env.GROQ_API_KEY) {
    return transcribeWithProvider(buffer, filename, "groq");
  }

  throw new Error("Importação de gravação indisponível no momento.");
}
