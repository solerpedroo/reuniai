import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type EmbeddingInsert = Database["public"]["Tables"]["transcript_embeddings"]["Insert"];

const BATCH_SIZE = 128;

export function isEmbeddingsConfigured(): boolean {
  return Boolean(process.env.EMBEDDINGS_API_KEY);
}

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const apiKey = process.env.EMBEDDINGS_API_KEY;
  const model = process.env.EMBEDDINGS_MODEL || "text-embedding-3-small";
  const baseUrl = process.env.EMBEDDINGS_API_BASE || "https://api.openai.com/v1";

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: inputs }),
  });

  if (!res.ok) {
    throw new Error(`Embeddings falhou: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return (data?.data ?? []).map((d: { embedding: number[] }) => d.embedding);
}

/**
 * Gera embeddings por segmento da reunião e os persiste em
 * `transcript_embeddings`. Idempotente: limpa os embeddings da reunião antes.
 * No-op se `EMBEDDINGS_API_KEY` não estiver configurada.
 */
export async function generateMeetingEmbeddings(
  admin: AdminClient,
  meetingId: string
): Promise<{ embedded: number }> {
  if (!isEmbeddingsConfigured()) return { embedded: 0 };

  const { data: segments } = await admin
    .from("transcript_segments")
    .select("id, text")
    .eq("meeting_id", meetingId)
    .order("sequence", { ascending: true });

  if (!segments || segments.length === 0) return { embedded: 0 };

  await admin.from("transcript_embeddings").delete().eq("meeting_id", meetingId);

  let embedded = 0;

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);
    const vectors = await embedBatch(batch.map((s) => s.text));

    const rows: EmbeddingInsert[] = batch.map((segment, idx) => ({
      segment_id: segment.id,
      meeting_id: meetingId,
      embedding: `[${vectors[idx].join(",")}]`,
    }));

    const { error } = await admin.from("transcript_embeddings").insert(rows);
    if (error) throw error;
    embedded += rows.length;
  }

  return { embedded };
}
