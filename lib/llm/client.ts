import "server-only";

export type LlmProvider = "groq" | "openai" | "anthropic";

type ProviderConfig = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
};

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
};

const BASE_URLS: Record<Exclude<LlmProvider, "anthropic">, string> = {
  groq: "https://api.groq.com/openai/v1",
  openai: "https://api.openai.com/v1",
};

function keyFor(provider: LlmProvider): string | undefined {
  if (provider === "groq") return process.env.GROQ_API_KEY;
  if (provider === "openai") return process.env.OPENAI_API_KEY;
  return process.env.ANTHROPIC_API_KEY;
}

function modelFor(provider: LlmProvider): string {
  if (provider === "groq") return process.env.GROQ_MODEL || DEFAULT_MODELS.groq;
  if (provider === "openai") return process.env.OPENAI_MODEL || DEFAULT_MODELS.openai;
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic;
}

/** Provedor escolhido por env, ou o primeiro com chave configurada. */
export function getLlmProvider(): LlmProvider | null {
  const preferred = process.env.LLM_PROVIDER as LlmProvider | undefined;
  if (preferred && keyFor(preferred)) return preferred;

  for (const provider of ["groq", "openai", "anthropic"] as const) {
    if (keyFor(provider)) return provider;
  }
  return null;
}

export function isLlmConfigured(): boolean {
  return getLlmProvider() !== null;
}

function resolveConfig(): ProviderConfig {
  const provider = getLlmProvider();
  if (!provider) throw new Error("Nenhum provedor de LLM configurado (GROQ/OPENAI/ANTHROPIC).");

  const apiKey = keyFor(provider);
  if (!apiKey) throw new Error(`Chave de API ausente para o provedor ${provider}.`);

  return {
    provider,
    apiKey,
    model: modelFor(provider),
    baseUrl: provider === "anthropic" ? "" : BASE_URLS[provider],
  };
}

/** Remove cercas markdown (```json ... ```) e extrai o objeto JSON. */
function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Resposta do LLM não é um JSON válido.");
  }
}

export type GenerateJsonInput = {
  system: string;
  user: string;
  timeoutMs?: number;
};

/** Gera uma resposta JSON do LLM configurado e a retorna já parseada. */
export async function generateJson(input: GenerateJsonInput): Promise<unknown> {
  const config = resolveConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 60_000);

  try {
    if (config.provider === "anthropic") {
      return await callAnthropic(config, input, controller.signal);
    }
    return await callOpenAiCompatible(config, input, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiCompatible(
  config: ProviderConfig,
  input: GenerateJsonInput,
  signal: AbortSignal
): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`LLM (${config.provider}) falhou: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Resposta vazia do LLM.");
  return extractJson(content);
}

async function callAnthropic(
  config: ProviderConfig,
  input: GenerateJsonInput,
  signal: AbortSignal
): Promise<unknown> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      temperature: 0.2,
      system: `${input.system}\n\nResponda APENAS com JSON válido, sem texto fora do objeto.`,
      messages: [{ role: "user", content: input.user }],
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`LLM (anthropic) falhou: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const content = data?.content?.[0]?.text;
  if (typeof content !== "string") throw new Error("Resposta vazia do LLM.");
  return extractJson(content);
}
