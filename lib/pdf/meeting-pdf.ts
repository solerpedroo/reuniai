import "server-only";

import PDFDocument from "pdfkit";
import { BRAND_HEX } from "@/lib/brand/config";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import type { MeetingExportData } from "@/lib/meetings/export-data";
import { formatTimestamp } from "@/lib/meetings/transcript";
import {
  formatDuration,
  formatMeetingDateTime,
  getMeetingDurationMs,
  PLATFORM_LABELS,
} from "@/lib/meetings/types";
import { PDF_FONT_NAMES, registerPdfFonts } from "@/lib/pdf/fonts";
import { PDF_THEME } from "@/lib/pdf/theme";

const FOOTER_Y_OFFSET = 32;
const CONTENT_BOTTOM = PDF_THEME.margin + FOOTER_Y_OFFSET;

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - PDF_THEME.margin * 2;
}

function resetCursor(doc: PDFKit.PDFDocument, y: number): void {
  doc.x = PDF_THEME.margin;
  doc.y = y;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number): void {
  if (doc.y + height > doc.page.height - CONTENT_BOTTOM) {
    doc.addPage();
    resetCursor(doc, PDF_THEME.margin);
  }
}

function drawStaticText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  options: PDFKit.Mixins.TextOptions = {}
): void {
  doc.text(text, x, y, {
    lineBreak: false,
    ...options,
  });
}

function drawPageChrome(doc: PDFKit.PDFDocument, pageNumber: number, pageCount: number): void {
  const footerY = doc.page.height - FOOTER_Y_OFFSET;
  const left = PDF_THEME.margin;
  const width = contentWidth(doc);

  doc.save();

  doc
    .strokeColor(PDF_THEME.border)
    .lineWidth(0.75)
    .moveTo(left, footerY - 12)
    .lineTo(left + width, footerY - 12)
    .stroke();

  doc.font(PDF_FONT_NAMES.regular).fontSize(8).fillColor(PDF_THEME.textMuted);

  drawStaticText(doc, `${PDF_THEME.productName} · ${PDF_THEME.tagline}`, left, footerY, {
    width: width - 90,
    align: "left",
  });

  drawStaticText(doc, `Página ${pageNumber} de ${pageCount}`, left, footerY, {
    width,
    align: "right",
  });

  doc.fillColor(PDF_THEME.text);
  doc.restore();
}

function applyFooters(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  const total = range.count;

  for (let index = 0; index < total; index += 1) {
    doc.switchToPage(range.start + index);
    drawPageChrome(doc, index + 1, total);
  }

  resetCursor(doc, PDF_THEME.margin);
}

function drawCoverHeader(doc: PDFKit.PDFDocument, data: MeetingExportData): void {
  const { meeting } = data;
  const headerHeight = 112;
  const left = PDF_THEME.margin;

  doc.save();
  doc.rect(0, 0, doc.page.width, headerHeight).fill(PDF_THEME.brand);
  doc
    .rect(0, 0, doc.page.width, headerHeight)
    .fillOpacity(0.1)
    .fill("#FFFFFF")
    .fillOpacity(1);
  doc.restore();

  doc.font(PDF_FONT_NAMES.semiBold).fontSize(9).fillColor("#FFFFFF");
  drawStaticText(doc, PDF_THEME.productName, left, 26, {
    width: contentWidth(doc),
  });

  doc
    .font(PDF_FONT_NAMES.semiBold)
    .fontSize(18)
    .fillColor("#FFFFFF")
    .text(meeting.title, left, 44, {
      width: contentWidth(doc),
      lineGap: 2,
    });

  const platform = PLATFORM_LABELS[meeting.platform] ?? meeting.platform;
  const meta = `${formatMeetingDateTime(meeting.started_at)} · ${formatDuration(getMeetingDurationMs(meeting))} · ${platform}`;

  doc
    .font(PDF_FONT_NAMES.regular)
    .fontSize(10)
    .fillColor("#E0EDFF")
    .text(meta, left, 86, { width: contentWidth(doc), lineGap: 1 });

  doc.fillColor(PDF_THEME.text);
  resetCursor(doc, headerHeight + 20);
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 36);
  const x = PDF_THEME.margin;
  const y = doc.y;

  doc
    .font(PDF_FONT_NAMES.semiBold)
    .fontSize(9)
    .fillColor(PDF_THEME.brand)
    .text(title.toUpperCase(), x, y, {
      width: contentWidth(doc),
      lineGap: 0,
    });

  doc
    .save()
    .strokeColor(PDF_THEME.brand)
    .lineWidth(2)
    .moveTo(x, y + 16)
    .lineTo(x + 28, y + 16)
    .stroke()
    .restore();

  resetCursor(doc, y + 26);
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
  doc.moveDown(0.35);
  doc.fillColor(PDF_THEME.text);
}

function drawSummaryCard(doc: PDFKit.PDFDocument, text: string): void {
  const padding = 14;
  const x = PDF_THEME.margin;
  const innerWidth = contentWidth(doc) - padding * 2;

  doc.font(PDF_FONT_NAMES.regular).fontSize(11);
  const textHeight = doc.heightOfString(text, {
    width: innerWidth,
    lineGap: 3,
  });
  const cardHeight = textHeight + padding * 2;

  ensureSpace(doc, cardHeight + 12);
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
      width: innerWidth,
      lineGap: 3,
    });

  resetCursor(doc, y + cardHeight + 12);
}

function drawBulletList(doc: PDFKit.PDFDocument, items: string[]): void {
  for (const item of items) {
    ensureSpace(doc, 22);
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

    resetCursor(doc, doc.y + 4);
  }
  doc.moveDown(0.15);
}

function drawTranscriptSegment(doc: PDFKit.PDFDocument, segment: MeetingExportData["segments"][number]): void {
  const x = PDF_THEME.margin;
  const timeWidth = 44;
  const textX = x + timeWidth;
  const textWidth = contentWidth(doc) - timeWidth;

  doc.font(PDF_FONT_NAMES.regular).fontSize(10);
  const bodyHeight = doc.heightOfString(segment.text, {
    width: textWidth,
    lineGap: 2,
  });
  ensureSpace(doc, bodyHeight + 22);

  const rowY = doc.y;

  doc
    .font(PDF_FONT_NAMES.mono)
    .fontSize(8.5)
    .fillColor(PDF_THEME.textMuted);
  drawStaticText(doc, formatTimestamp(segment.start_ms), x, rowY, {
    width: timeWidth - 4,
    align: "left",
  });

  doc
    .font(PDF_FONT_NAMES.medium)
    .fontSize(10)
    .fillColor(PDF_THEME.brand);
  drawStaticText(doc, segment.speaker_label, textX, rowY, {
    width: textWidth,
    align: "left",
  });

  doc
    .font(PDF_FONT_NAMES.regular)
    .fontSize(10)
    .fillColor(PDF_THEME.text)
    .text(segment.text, textX, rowY + 14, {
      width: textWidth,
      lineGap: 2,
    });

  resetCursor(doc, doc.y + 8);
}

export async function buildMeetingPdfFromData(data: MeetingExportData): Promise<Buffer> {
  const { summary, actionItems, segments, highlights } = data;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PDF_THEME.margin,
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: data.meeting.title,
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
    }

    const topics = parseTopics(summary?.topics ?? []);
    if (topics.length > 0) {
      drawSectionTitle(doc, "Tópicos discutidos");
      for (const topic of topics) {
        ensureSpace(doc, 40);
        doc
          .font(PDF_FONT_NAMES.medium)
          .fontSize(11)
          .fillColor(PDF_THEME.text)
          .text(topic.title, PDF_THEME.margin, doc.y, { width: contentWidth(doc) });
        doc.moveDown(0.1);
        if (topic.summary) {
          drawParagraph(doc, topic.summary, { muted: true });
        } else {
          doc.moveDown(0.15);
        }
      }
    }

    const decisions = parseDecisions(summary?.decisions ?? []);
    if (decisions.length > 0) {
      drawSectionTitle(doc, "Decisões");
      drawBulletList(doc, decisions);
    }

    if (actionItems.length > 0) {
      drawSectionTitle(doc, "Atribuições");
      for (const item of actionItems) {
        ensureSpace(doc, 24);
        const done = item.status === "done";
        const assignee = item.assignee ? ` · ${item.assignee}` : "";
        const due = item.due_date ? ` · prazo ${item.due_date}` : "";
        const prefix = done ? "[x] " : "[ ] ";
        drawParagraph(doc, `${prefix}${item.title}${assignee}${due}`);
      }
    }

    if (highlights.length > 0) {
      drawSectionTitle(doc, "Momentos marcados");
      drawBulletList(
        doc,
        highlights.map((item) => `[${formatTimestamp(item.start_ms)}] ${item.label}`)
      );
    }

    if (segments.length > 0) {
      ensureSpace(doc, 60);
      drawSectionTitle(doc, "Transcrição");
      for (const segment of segments) {
        drawTranscriptSegment(doc, segment);
      }
    }

    applyFooters(doc);
    doc.end();
  });
}
