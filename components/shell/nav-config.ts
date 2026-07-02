import {
  CalendarBlank,
  ChartLineUp,
  CheckSquare,
  ClipboardText,
  Gear,
  House,
  UserCircle,
  UsersThree,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: Icon;
};

export const NAV_PRIMARY_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Visão geral",
    description: "Resumo e indicadores das suas reuniões",
    icon: House,
  },
  {
    href: "/agenda",
    label: "Agenda",
    description: "Seu dia em ordem cronológica",
    icon: CalendarBlank,
  },
  {
    href: "/revisar",
    label: "Revisar",
    description: "Fila de reuniões pendentes de fechamento",
    icon: ClipboardText,
  },
  {
    href: "/reunioes",
    label: "Reuniões",
    description: "Lista completa de reuniões gravadas",
    icon: VideoCamera,
  },
  {
    href: "/tarefas",
    label: "Tarefas",
    description: "Action items de todas as reuniões",
    icon: CheckSquare,
  },
  {
    href: "/participantes",
    label: "Participantes",
    description: "Pessoas com quem você se reuniu",
    icon: UsersThree,
  },
  {
    href: "/insights",
    label: "Insights",
    description: "Tendências e métricas das suas reuniões",
    icon: ChartLineUp,
  },
];

export const NAV_ACCOUNT_ITEMS: NavItem[] = [
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

export const NAV_ITEMS: NavItem[] = [...NAV_PRIMARY_ITEMS, ...NAV_ACCOUNT_ITEMS];

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

  if (pathname === "/tarefas" || pathname.startsWith("/tarefas?")) {
    return NAV_ITEMS.find((item) => item.href === "/tarefas") ?? NAV_ITEMS[0];
  }

  if (pathname === "/participantes" || pathname.startsWith("/participantes/")) {
    return NAV_ITEMS.find((item) => item.href === "/participantes") ?? NAV_ITEMS[0];
  }

  if (pathname === "/agenda" || pathname.startsWith("/agenda?")) {
    return NAV_ITEMS.find((item) => item.href === "/agenda") ?? NAV_ITEMS[0];
  }

  if (pathname === "/revisar" || pathname.startsWith("/revisar?")) {
    return NAV_ITEMS.find((item) => item.href === "/revisar") ?? NAV_ITEMS[0];
  }

  if (pathname === "/insights" || pathname.startsWith("/insights?")) {
    return NAV_ITEMS.find((item) => item.href === "/insights") ?? NAV_ITEMS[0];
  }

  const exact = NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) return exact;

  const nested = NAV_ITEMS.find(
    (item) => item.href !== "/" && pathname.startsWith(`${item.href}/`)
  );
  return nested ?? NAV_ITEMS[0];
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
