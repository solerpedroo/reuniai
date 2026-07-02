export type ShareLinkStatus = "active" | "expired" | "revoked";

export type ShareLinkHubItem = {
  id: string;
  meetingId: string;
  meetingTitle: string;
  tokenSuffix: string;
  shareUrl: string;
  status: ShareLinkStatus;
  expiresAt: string;
  createdAt: string;
  permissionsSummary: string;
};

export type ShareLinksHub = {
  items: ShareLinkHubItem[];
  activeCount: number;
};

export function maskShareToken(token: string): string {
  if (token.length <= 6) return "••••••";
  return `…${token.slice(-6)}`;
}
