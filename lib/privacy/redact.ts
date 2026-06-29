import "server-only";

import { z } from "zod";
import { generateJson, isLlmConfigured } from "@/lib/llm/client";

export const REDACTED_PLACEHOLDER = "[REDACTED]";

export type RedactionType =
  | "email"
  | "phone"
  | "cpf"
  | "cnpj"
  | "credit_card"
  | "password"
  | "other";

export type RedactionAudit = {
  count: number;
  types: RedactionType[];
};

const PATTERNS: { type: RedactionType; pattern: RegExp }[] = [
  {
    type: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    type: "cpf",
    pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
  },
  {
    type: "cnpj",
    pattern: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
  },
  {
    type: "phone",
    pattern: /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b/g,
  },
  {
    type: "credit_card",
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
  },
  {
    type: "password",
    pattern: /\b(?:senha|password|pin)\s*(?:é|e|:)?\s*["']?[\w@#$%&*!-]{4,}["']?/gi,
  },
];

const LlmSpansSchema = z.object({
  spans: z
    .array(
      z.object({
        text: z.string().max(200),
        type: z.enum(["email", "phone", "cpf", "cnpj", "credit_card", "password", "other"]),
      })
    )
    .default([]),
});

function mergeAudit(a: RedactionAudit, b: RedactionAudit): RedactionAudit {
  return {
    count: a.count + b.count,
    types: [...new Set([...a.types, ...b.types])],
  };
}

export function redactText(text: string): { text: string; audit: RedactionAudit } {
  let result = text;
  let audit: RedactionAudit = { count: 0, types: [] };

  for (const { type, pattern } of PATTERNS) {
    const matches = result.match(pattern);
    if (!matches?.length) continue;
    audit = mergeAudit(audit, { count: matches.length, types: [type] });
    result = result.replace(pattern, REDACTED_PLACEHOLDER);
  }

  return { text: result, audit };
}

async function redactWithLlm(text: string): Promise<{ text: string; audit: RedactionAudit }> {
  if (!isLlmConfigured() || text.length < 20) {
    return { text, audit: { count: 0, types: [] } };
  }

  const snippet = text.length > 8_000 ? text.slice(0, 8_000) : text;

  try {
    const raw = await generateJson({
      system: [
        "Você identifica dados sensíveis em texto de reuniões em português do Brasil.",
        "Retorne apenas trechos EXATOS que aparecem no texto: emails, telefones, CPF, CNPJ, cartões, senhas faladas.",
        "Não invente trechos. Se não houver PII, retorne spans vazio.",
      ].join(" "),
      user: `Texto:\n${snippet}\n\nRetorne JSON: { "spans": [{ "text": "trecho exato", "type": "email|phone|cpf|cnpj|credit_card|password|other" }] }`,
      timeoutMs: 20_000,
    });

    const parsed = LlmSpansSchema.parse(raw);
    let result = text;
    let audit: RedactionAudit = { count: 0, types: [] };

    for (const span of parsed.spans) {
      if (!span.text || !result.includes(span.text)) continue;
      audit = mergeAudit(audit, { count: 1, types: [span.type] });
      result = result.split(span.text).join(REDACTED_PLACEHOLDER);
    }

    return { text: result, audit };
  } catch {
    return { text, audit: { count: 0, types: [] } };
  }
}

export async function redactTextFull(
  text: string,
  options: { useLlm?: boolean } = {}
): Promise<{ text: string; audit: RedactionAudit }> {
  const regexResult = redactText(text);
  if (!options.useLlm) return regexResult;

  const llmResult = await redactWithLlm(regexResult.text);
  return {
    text: llmResult.text,
    audit: mergeAudit(regexResult.audit, llmResult.audit),
  };
}

export async function redactManyTexts(
  texts: string[],
  options: { useLlm?: boolean } = {}
): Promise<{ texts: string[]; audit: RedactionAudit }> {
  let audit: RedactionAudit = { count: 0, types: [] };
  const redacted: string[] = [];

  for (const text of texts) {
    const result = await redactTextFull(text, options);
    redacted.push(result.text);
    audit = mergeAudit(audit, result.audit);
  }

  return { texts: redacted, audit };
}
