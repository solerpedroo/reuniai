import { Gear, House, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: Icon;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Visão geral",
    description: "Resumo e indicadores das suas reuniões",
    icon: House,
  },
  {
    href: "/reunioes",
    label: "Reuniões",
    description: "Lista completa de reuniões gravadas",
    icon: VideoCamera,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    description: "Calendário, auto-join e conta",
    icon: Gear,
  },
];

export const PRODUCT = {
  name: "ReuniAI",
  tagline: "Inteligência de reuniões",
  context: "Transcrição · Resumo · Action items",
} as const;

export function getNavItem(pathname: string): NavItem {
  const exact = NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) return exact;

  const nested = NAV_ITEMS.find(
    (item) => item.href !== "/" && pathname.startsWith(`${item.href}/`)
  );
  return nested ?? NAV_ITEMS[0];
}
