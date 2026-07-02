import "server-only";

import PDFDocument from "pdfkit";
import { BRAND_HEX } from "@/lib/brand/config";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import type { MeetingExportData } from "@/lib/meetings/export-data";
import { formatTimestamp } from "@/lib/meetings/transcript";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
  PLATFORM_LABELS,
} from "@/lib/meetings/types";
import { PDF_FONT_NAMES, registerPdfFonts } from "@/lib/pdf/fonts";
import { PDF_THEME } from "@/lib/pdf/theme";

const CONTENT_BOTTOM = 72;

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - PDF_THEME.margin * 2;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number): void {
  if (doc.y + height > doc.page.height - CONTENT_BOTTOM) {
    doc.addPage();
    doc.y = PDF_THEME.margin;
  }
}

function drawPageChrome(doc: PDFKit.PDFDocument, pageNumber: number, pageCount: number): void {
  const footerY = doc.page.height - 36;
  doc
    .save()
    .strokeColor(PDF_THEME.border)
    .moveTo(PDF_THEME.margin, footerY - 8)
    .lineTo(doc.page.width - PDF_THEME.margin, footerY - 8)
    .stroke()
    .restore();

  doc
    .font(PDF_FONT_NAMES.regular)
    .fontSize(8)
    .fillColor(PDF_THEME.textMuted)
    .text(`${PDF_THEME.productName} · ${PDF_THEME.tagline}`, PDF_THEME.margin, footerY, {
      width: contentWidth(doc) / 2,
      align: "left",
      lineBreak: false,
    });

  doc.text(`Página ${pageNumber} de ${pageCount}`, PDF_THEME.margin, footerY, {
    width: contentWidth(doc),
    align: "right",
    lineBreak: false,
  });

  doc.fillColor(PDF_THEME.text);
}

function drawCoverHeader(doc: PDFKit.PDFDocument, data: MeetingExportData): void {
  const { meeting } = data;
  const headerHeight = 118;

  doc.save();
  doc.rect(0, 0, doc.page.width, headerHeight).fill(PDF_THEME.brand);
  doc
    .rect(0, 0, doc.page.width, headerHeight)
    .fillOpacity(0.12)
    .fill("#FFFFFF")
    .fillOpacity(1);
  doc.restore();

  doc
    .font(PDF_FONT_NAMES.semiBold)
    .fontSize(9)
    .fillColor("#FFFFFF")
    .text(PDF_THEME.productName.toUpperCase(), PDF_THEME.margin, 28, {
      characterSpacing: 1.2,
    });

  doc
    .font(PDF_FONT_NAMES.semiBold)
    .fontSize(20)
    .fillColor("#FFFFFF")
    .text(meeting.title, PDF_THEME.margin, 46, {
      width: contentWidth(doc),
      lineGap: 2,
    });

  const platform = PLATFORM_LABELS[meeting.platform] ?? meeting.platform;
  const meta = `${formatMeetingDate(meeting.started_at)} · ${formatDuration(getMeetingDurationMs(meeting))} · ${platform}`;

  doc
    .font(PDF_FONT_NAMES.regular)
    .fontSize(10)
    .fillColor("#E0EDFF")
    .text(meta, PDF_THEME.margin, 92, { width: contentWidth(doc) });

  doc.fillColor(PDF_THEME.text);
  doc.y = headerHeight + 24;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 34);
  const x = PDF_THEME.margin;

  doc
    .font(PDF_FONT_NAMES.semiBold)
    .fontSize(9)
    .fillColor(PDF_THEME.brand)
    .text(title.toUpperCase(), x, doc.y, { characterSpacing: 0.8 });

  const labelY = doc.y;
  doc
    .save()
    .strokeColor(PDF_THEME.brand)
    .lineWidth(2)
    .moveTo(x, labelY + 14)
    .lineTo(x + 28, labelY + 14)
    .stroke()
    .restore();

  doc.y = labelY + 22;
  doc.fillColor(PDF_THEME.text);
}

function drawParagraph(doc: PDFKit.PDFDocument, text: string, options?: { muted?: boolean }): void {
  doc
    .font(PDF_FONT_NAMES.regular)
    .fontSize(11)
    .fillColor(options?.muted ? PDF_THEME.textMuted : PDF_THEME.text)
    .text(text, PDF_THEME.margin, doc.y, {
      width: contentWidth(doc),
      lineGap: 3,
    });
  doc.moveDown(0.4);
  doc.fillColor(PDF_THEME.text);
}

function drawSummaryCard(doc: PDFKit.PDFDocument, text: string): void {
  const padding = 14;
  const textWidth = contentWidth(doc) - padding * 2;
  doc.font(PDF_FONT_NAMES.regular).fontSize(11);
  const textHeight = doc.heightOfString(text, {
    width: textWidth,
    lineGap: 3,
  });
  const cardHeight = textHeight + padding * 2 + 8;

  ensureSpace(doc, cardHeight + 8);
  const x = PDF_THEME.margin;
  const y = doc.y;

  doc
    .save()
    .roundedRect(x, y, contentWidth(doc), cardHeight, 8)
    .fillAndStroke(PDF_THEME.summaryBg, PDF_THEME.summaryBorder)
    .restore();

  doc
    .font(PDF_FONT_NAMES.regular)
    .fontSize(11)
    .fillColor(PDF_THEME.text)
    .text(text, x + padding, y + padding, {
      width: textWidth,
      lineGap: 3,
    });

  doc.y = y + cardHeight + 10;
}

function drawBulletList(doc: PDFKit.PDFDocument, items: string[]): void {
  for (const item of items) {
    ensureSpace(doc, 24);
    const x = PDF_THEME.margin;
    const y = doc.y;

    doc
      .save()
      .fillColor(BRAND_HEX)
      .circle(x + 4, y + 6, 2.5)
      .fill()
      .restore();

    doc
      .font(PDF_FONT_NAMES.regular)
      .fontSize(11)
      .fillColor(PDF_THEME.text)
      .text(item, x + 14, y, {
        width: contentWidth(doc) - 14,
        lineGap: 2,
      });
    doc.moveDown(0.35);
  }
  doc.moveDown(0.2);
}

export async function buildMeetingPdfFromData(data: MeetingExportData): Promise<Buffer> {
  const { meeting, summary, actionItems, segments, highlights } = data;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PDF_THEME.margin,
      bufferPages: true,
      info: {
        Title: meeting.title,
        Author: PDF_THEME.productName,
        Subject: "Exportação de reunião",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerPdfFonts(doc);
    drawCoverHeader(doc, data);

    if (summary?.executive_summary) {
      drawSectionTitle(doc, "Resumo executivo");
      drawSummaryCard(doc, summary.executive_summary);
      doc.moveDown(0.2);
    }

    const topics = parseTopics(summary?.topics ?? []);
    if (topics.length > 0) {
      drawSectionTitle(doc, "Tópicos discutidos");
      for (const topic of topics) {
        ensureSpace(doc, 48);
        doc
          .font(PDF_FONT_NAMES.medium)
          .fontSize(11)
          .fillColor(PDF_THEME.text)
          .text(topic.title, PDF_THEME.margin, doc.y, { width: contentWidth(doc) });
        doc.moveDown(0.15);
        if (topic.summary) {
          drawParagraph(doc, topic.summary, { muted: true });
        } else {
          doc.moveDown(0.2);
        }
      }
      doc.moveDown(0.1);
    }

    const decisions = parseDecisions(summary?.decisions ?? []);
    if (decisions.length > 0) {
      drawSectionTitle(doc, "Decisões");
      drawBulletList(doc, decisions);
    }

    if (actionItems.length > 0) {
      drawSectionTitle(doc, "Atribuições");
      for (const item of actionItems) {
        ensureSpace(doc, 28);
        const done = item.status === "done";
        const assignee = item.assignee ? ` · ${item.assignee}` : "";
        const due = item.due_date ? ` · prazo ${item.due_date}` : "";
        const prefix = done ? "✓ " : "○ ";
        drawParagraph(doc, `${prefix}${item.title}${assignee}${due}`);
      }
      doc.moveDown(0.1);
    }

    if (highlights.length > 0) {
      drawSectionTitle(doc, "Momentos marcados");
      drawBulletList(
        doc,
        highlights.map((item) => `[${formatTimestamp(item.start_ms)}] ${item.label}`)
      );
    }

    if (segments.length > 0) {
      doc.addPage();
      doc.y = PDF_THEME.margin;
      drawSectionTitle(doc, "Transcrição");

      for (const segment of segments) {
        ensureSpace(doc, 36);
        const x = PDF_THEME.margin;

        doc
          .font(PDF_FONT_NAMES.mono)
          .fontSize(8.5)
          .fillColor(PDF_THEME.textMuted)
          .text(formatTimestamp(segment.start_ms), x, doc.y, {
            width: 44,
            lineBreak: false,
          });

        doc
          .font(PDF_FONT_NAMES.medium)
          .fontSize(10)
          .fillColor(PDF_THEME.brand)
          .text(segment.speaker_label, x + 48, doc.y, {
            width: contentWidth(doc) - 48,
            lineBreak: false,
          });

        doc.moveDown(0.1);
        doc
          .font(PDF_FONT_NAMES.regular)
          .fontSize(10)
          .fillColor(PDF_THEME.text)
          .text(segment.text, x + 48, doc.y, {
            width: contentWidth(doc) - 48,
            lineGap: 2,
          });
        doc.moveDown(0.45);
      }
    }

    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      doc.switchToPage(range.start + index);
      drawPageChrome(doc, index + 1, range.count);
    }

    doc.end();
  });
}
