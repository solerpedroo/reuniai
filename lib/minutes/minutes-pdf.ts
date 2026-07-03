import "server-only";

import PDFDocument from "pdfkit";
import type { MeetingMinutesContent } from "@/lib/minutes/generate-minutes";
import { PDF_FONT_NAMES, registerPdfFonts } from "@/lib/pdf/fonts";
import { PDF_THEME } from "@/lib/pdf/theme";

export async function buildMinutesPdf(content: MeetingMinutesContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PDF_THEME.margin, size: "A4" });
    registerPdfFonts(doc);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font(PDF_FONT_NAMES.semiBold).fontSize(18).text(`Ata — ${content.meeting_title}`);
    doc.moveDown(0.5);
    doc.font(PDF_FONT_NAMES.regular).fontSize(10).fillColor(PDF_THEME.textMuted);
    doc.text(`Data: ${content.meeting_date}`);
    doc.fillColor(PDF_THEME.text);
    doc.moveDown();

    const section = (title: string, items: string[]) => {
      doc.font(PDF_FONT_NAMES.semiBold).fontSize(12).text(title);
      doc.moveDown(0.25);
      doc.font(PDF_FONT_NAMES.regular).fontSize(10);
      if (items.length === 0) {
        doc.text("—");
      } else {
        for (const item of items) doc.text(`• ${item}`);
      }
      doc.moveDown();
    };

    section("Presentes", content.presentes);
    section("Pauta", content.pauta);
    section("Deliberações", content.deliberacoes);
    section(
      "Encaminhamentos",
      content.encaminhamentos.map(
        (e) => `${e.titulo}${e.responsavel ? ` (${e.responsavel})` : ""}`
      )
    );

    if (content.proxima_reuniao) {
      section("Próxima reunião", [content.proxima_reuniao]);
    }

    doc.end();
  });
}
