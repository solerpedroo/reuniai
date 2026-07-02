import { BRAND_HEX, BRAND_HEX_DARK, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand/config";

export const PDF_THEME = {
  brand: BRAND_HEX,
  brandDark: BRAND_HEX_DARK,
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E2E8F0",
  surface: "#F8FAFC",
  summaryBg: "#EFF6FF",
  summaryBorder: "#BFDBFE",
  productName: PRODUCT_NAME,
  tagline: PRODUCT_TAGLINE,
  margin: 48,
  sectionGap: 18,
} as const;
