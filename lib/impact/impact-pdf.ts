import "server-only";

import PDFDocument from "pdfkit";
import type { PersonalImpactReport } from "@/lib/impact/personal-impact";
import { formatHours } from "@/lib/meetings/types";
import { PDF_FONT_NAMES, registerPdfFonts } from "@/lib/pdf/fonts";
import { PDF_THEME } from "@/lib/pdf/theme";

export async function buildImpactPdf(report: PersonalImpactReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PDF_THEME.margin, size: "A4" });
    registerPdfFonts(doc);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font(PDF_FONT_NAMES.semiBold).fontSize(18).text("Retrospectiva ReuniAI");
    doc.moveDown(0.5);
    doc.font(PDF_FONT_NAMES.regular).fontSize(10).fillColor(PDF_THEME.textMuted);
    doc.text(`Período: ${report.period}`);
    doc.fillColor(PDF_THEME.text);
    doc.moveDown();

    const lines = [
      `Reuniões: ${report.insights.meetingCount}`,
      `Horas gravadas: ${formatHours(report.insights.hoursRecordedMs)}`,
      `Coach (média): ${report.avgCoachScore ?? "—"}`,
      `Compromissos cumpridos: ${report.commitmentsFulfilledRate ?? "—"}%`,
      `Decisões cumpridas: ${report.decisionsDoneRate ?? "—"}%`,
      `Follow-ups enviados: ${report.followUpsSent}`,
      `Taxa de tarefas: ${report.insights.taskCompletionRate ?? "—"}%`,
    ];

    doc.font(PDF_FONT_NAMES.semiBold).fontSize(12).text("Métricas");
    doc.moveDown(0.25);
    doc.font(PDF_FONT_NAMES.regular).fontSize(10);
    for (const line of lines) doc.text(`• ${line}`);
    doc.moveDown();

    if (report.narrative) {
      doc.font(PDF_FONT_NAMES.semiBold).fontSize(12).text("Narrativa");
      doc.moveDown(0.25);
      doc.font(PDF_FONT_NAMES.regular).fontSize(10).text(report.narrative);
    }

    doc.end();
  });
}
