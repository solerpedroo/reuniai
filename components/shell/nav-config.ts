import { Gear, House, UserCircle, VideoCamera } from "@phosphor-icons/react/dist/ssr";
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
    href: "/perfil",
    label: "Meu perfil",
    description: "Nome, fuso horário e idioma da conta",
    icon: UserCircle,
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    description: "Calendário, auto-join e integrações",
    icon: Gear,
  },
];

export { PRODUCT } from "@/lib/brand/config";

export function getNavItem(pathname: string): NavItem {
  if (pathname === "/busca" || pathname.startsWith("/busca?")) {
    return {
      href: "/busca",
      label: "Busca global",
      description: "Pesquisar título e transcrições",
      icon: NAV_ITEMS[1]!.icon,
    };
  }

  const exact = NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) return exact;

  const nested = NAV_ITEMS.find(
    (item) => item.href !== "/" && pathname.startsWith(`${item.href}/`)
  );
  return nested ?? NAV_ITEMS[0];
}
