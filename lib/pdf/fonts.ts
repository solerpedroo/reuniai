import fs from "node:fs";
import path from "node:path";
import type PDFDocument from "pdfkit";

type PdfDoc = InstanceType<typeof PDFDocument>;

const GEIST_SANS_DIR = path.join(
  process.cwd(),
  "node_modules",
  "geist",
  "dist",
  "fonts",
  "geist-sans"
);

const GEIST_MONO_DIR = path.join(
  process.cwd(),
  "node_modules",
  "geist",
  "dist",
  "fonts",
  "geist-mono"
);

function requireFont(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fonte não encontrada para exportação PDF: ${filePath}`);
  }
  return filePath;
}

export const PDF_FONTS = {
  regular: requireFont(path.join(GEIST_SANS_DIR, "Geist-Regular.ttf")),
  medium: requireFont(path.join(GEIST_SANS_DIR, "Geist-Medium.ttf")),
  semiBold: requireFont(path.join(GEIST_SANS_DIR, "Geist-SemiBold.ttf")),
  mono: requireFont(path.join(GEIST_MONO_DIR, "GeistMono-Regular.ttf")),
} as const;

export const PDF_FONT_NAMES = {
  regular: "Geist-Regular",
  medium: "Geist-Medium",
  semiBold: "Geist-SemiBold",
  mono: "GeistMono-Regular",
} as const;

export function registerPdfFonts(doc: PdfDoc): void {
  doc.registerFont(PDF_FONT_NAMES.regular, PDF_FONTS.regular);
  doc.registerFont(PDF_FONT_NAMES.medium, PDF_FONTS.medium);
  doc.registerFont(PDF_FONT_NAMES.semiBold, PDF_FONTS.semiBold);
  doc.registerFont(PDF_FONT_NAMES.mono, PDF_FONTS.mono);
}
