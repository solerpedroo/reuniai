import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_HEADER = "x-reuniai-signature";
const SIGNATURE_PREFIX = "sha256=";

export function signWebhookPayload(secret: string, body: string): string {
  const digest = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `${SIGNATURE_PREFIX}${digest}`;
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX)) return false;
  const expected = signWebhookPayload(secret, body);
  const received = signatureHeader.trim();

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

export function webhookSignatureHeaderName(): string {
  return SIGNATURE_HEADER;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 2_000, 8_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type DeliverResult = {
  ok: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
};

/** POST com HMAC-SHA256 e até 3 tentativas. */
export async function deliverWebhook(
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>
): Promise<DeliverResult> {
  const envelope = {
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  };
  const body = JSON.stringify(envelope);
  const signature = signWebhookPayload(secret, body);

  let lastError: string | undefined;
  let statusCode: number | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt] ?? 8_000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [SIGNATURE_HEADER]: signature,
          "User-Agent": "ReuniAI-Webhooks/1.0",
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });

      statusCode = res.status;
      if (res.ok) {
        return { ok: true, statusCode, attempts: attempt + 1 };
      }
      lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { ok: false, statusCode, error: lastError, attempts: MAX_ATTEMPTS };
}
