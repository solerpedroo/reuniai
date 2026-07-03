import { BRAND_HEX, PRODUCT_NAME, getAppUrl } from "@/lib/brand/config";

type EmailLayoutOptions = {
  title: string;
  bodyHtml: string;
  footerNote?: string;
};

export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; background: ${BRAND_HEX}; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 500;">${label}</a>`;
}

export function emailLink(href: string, label: string): string {
  return `<a href="${href}" style="color: ${BRAND_HEX}; text-decoration: none;">${label}</a>`;
}

/** Envelope HTML de email com header de marca unificado. */
export function wrapEmailHtml({ title, bodyHtml, footerNote }: EmailLayoutOptions): string {
  const appUrl = getAppUrl();
  const logoUrl = `${appUrl}/brand/logo-mark.svg`;

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <div style="padding: 24px 0 16px; border-bottom: 1px solid #e5e7eb;">
        <img src="${logoUrl}" alt="${PRODUCT_NAME}" width="44" height="44" style="display: block;" />
      </div>
      <div style="padding: 24px 0;">
        <h1 style="font-size: 20px; margin: 0 0 16px; font-weight: 600;">${title}</h1>
        ${bodyHtml}
      </div>
      ${
        footerNote
          ? `<p style="margin-top: 24px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 16px;">${footerNote}</p>`
          : ""
      }
    </div>
  `;
}
