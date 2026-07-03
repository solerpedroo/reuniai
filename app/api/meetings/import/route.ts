import { NextResponse } from "next/server";
import { z } from "zod";
import { createImportedMeeting } from "@/lib/meetings/create-import";
import { processImportedRecording } from "@/lib/pipeline/process-import";
import { isTranscriptionConfigured } from "@/lib/pipeline/transcribe-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALLOWED_EXTENSIONS = new Set([
  "mp3",
  "mp4",
  "m4a",
  "wav",
  "webm",
  "ogg",
  "mpeg",
  "mpga",
]);

const ImportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  startedAt: z.string().trim().optional(),
  analysisTemplate: z.string().trim().max(50).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!isTranscriptionConfigured()) {
    return NextResponse.json(
      {
        error:
          "Transcrição não configurada. Defina OPENAI_API_KEY ou GROQ_API_KEY no servidor.",
      },
      { status: 503 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Formulário inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo de áudio/vídeo é obrigatório." }, { status: 400 });
  }

  const parsed = ImportSchema.safeParse({
    title: formData.get("title"),
    startedAt: formData.get("startedAt") || undefined,
    analysisTemplate: formData.get("analysisTemplate") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "Formato não suportado. Use mp3, mp4, m4a, wav ou webm." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const created = await createImportedMeeting(admin, user.id, parsed.data);
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await processImportedRecording(
    admin,
    user.id,
    created.meeting.id,
    buffer,
    file.name
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, meetingId: created.meeting.id }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    meetingId: result.meetingId,
    segments: result.segments,
  });
}
