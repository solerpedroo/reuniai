import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { analyzeWithTemplate } from "@/lib/analysis/templates";
import { resolveAnalysisTemplate } from "@/lib/analysis/resolve-template";
import { parseUserLocale } from "@/lib/profile/locale";
import { isLlmConfigured } from "@/lib/llm/client";
import { generateMeetingEmbeddings } from "@/lib/embeddings/generate";
import { generateAndSaveFollowUp } from "@/lib/meetings/follow-up";
import { dispatchMeetingCompleted } from "@/lib/integrations/dispatch";
import { sendMeetingCompletedEmail } from "@/lib/email/meeting-completed";
import { notifyUser } from "@/lib/notifications/dispatch";
import {
  completedNotificationHref,
  notificationDedupeKey,
} from "@/lib/notifications/hrefs";
import { suggestAndApplyTags } from "@/lib/tags/auto-tag";
import { detectAndSaveCommitments } from "@/lib/meetings/commitments";

type AdminClient = ReturnType<typeof createAdminClient>;
type ActionItemInsert = Database["public"]["Tables"]["action_items"]["Insert"];

export type AnalyzeResult = {
  status: "completed" | "skipped" | "failed";
  actionItems: number;
};

/**
 * Gera resumo executivo, tópicos, decisões e action items a partir da
 * transcrição persistida, e salva em `meeting_summaries` + `action_items`.
 * Idempotente: substitui o resumo e os action items de origem `ai`.
 */
export async function analyzeMeetingById(
  admin: AdminClient,
  meetingId: string
): Promise<AnalyzeResult> {
  if (!isLlmConfigured()) {
    return { status: "skipped", actionItems: 0 };
  }

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, analysis_template, calendar_recurring_event_id")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return { status: "skipped", actionItems: 0 };

  const { data: segments } = await admin
    .from("transcript_segments")
    .select("speaker_label, text")
    .eq("meeting_id", meetingId)
    .order("sequence", { ascending: true });

  if (!segments || segments.length === 0) {
    return { status: "skipped", actionItems: 0 };
  }

  const transcript = segments.map((s) => `${s.speaker_label}: ${s.text}`).join("\n");

  await admin
    .from("meetings")
    .update({ status: "processing", meeting_reviewed_at: null })
    .eq("id", meetingId);

  try {
    const [templateId, profileRes] = await Promise.all([
      resolveAnalysisTemplate(admin, meeting),
      admin.from("profiles").select("locale").eq("id", meeting.user_id).maybeSingle(),
    ]);

    const locale = parseUserLocale(
      (profileRes.data as { locale?: string } | null)?.locale
    );

    const analysis = await analyzeWithTemplate(templateId, transcript, {
      meetingTitle: meeting.title,
      locale,
    });

    await admin.from("meeting_summaries").upsert(
      {
        meeting_id: meetingId,
        executive_summary: analysis.executive_summary,
        topics: analysis.topics,
        decisions: analysis.decisions,
        raw_json: {
          ...analysis,
          template_id: analysis.template_id,
        } as unknown as Database["public"]["Tables"]["meeting_summaries"]["Insert"]["raw_json"],
      },
      { onConflict: "meeting_id" }
    );

    // Recria os action items gerados por IA (preserva os manuais).
    await admin
      .from("action_items")
      .delete()
      .eq("meeting_id", meetingId)
      .eq("source", "ai");

    if (analysis.action_items.length > 0) {
      const rows: ActionItemInsert[] = analysis.action_items.map((item) => ({
        meeting_id: meetingId,
        user_id: meeting.user_id,
        title: item.title,
        assignee: item.assignee,
        due_date: item.due_date,
        source: "ai",
      }));
      const { error } = await admin.from("action_items").insert(rows);
      if (error) throw error;
    }

    try {
      await detectAndSaveCommitments(
        admin,
        meetingId,
        transcript,
        analysis.action_items.map((item) => item.title)
      );
    } catch (err) {
      console.error("Falha na detecção de compromissos (não bloqueante):", err);
    }

    // Embeddings (opcional, prep para RAG da Onda 10).
    try {
      await generateMeetingEmbeddings(admin, meetingId);
    } catch (err) {
      console.error("Falha ao gerar embeddings (não bloqueante):", err);
    }

    await admin.from("meetings").update({ status: "completed" }).eq("id", meetingId);

    try {
      await generateAndSaveFollowUp(admin, meetingId);
      await notifyUser(admin, {
        userId: meeting.user_id,
        kind: "completed",
        title: "Reunião processada",
        body: `Revise atribuições, follow-up e compartilhamento de "${meeting.title}".`,
        href: completedNotificationHref(meetingId),
        dedupeKey: notificationDedupeKey("completed", [meetingId]),
      });
      try {
        await sendMeetingCompletedEmail(admin, meetingId);
      } catch (err) {
        console.error("Falha ao enviar email de reunião concluída (não bloqueante):", err);
      }
      await suggestAndApplyTags(admin, meetingId);
      await dispatchMeetingCompleted(admin, meetingId);
    } catch (err) {
      console.error("Falha pós-análise (não bloqueante):", err);
    }

    return { status: "completed", actionItems: analysis.action_items.length };
  } catch (err) {
    console.error("Falha ao analisar reunião:", err);
    await admin
      .from("meetings")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message.slice(0, 500) : "Falha na análise por IA",
      })
      .eq("id", meetingId);
    return { status: "failed", actionItems: 0 };
  }
}
