import {
  BookmarkSimple,
  Books,
  BookOpen,
  CalendarBlank,
  CalendarCheck,
  ChartLineUp,
  ChatCircleDots,
  ChatsCircle,
  CheckSquare,
  ClipboardText,
  EnvelopeSimple,
  FileText,
  Gavel,
  Gear,
  Handshake,
  House,
  LinkSimple,
  MagnifyingGlass,
  NotePencil,
  Sparkle,
  UserCircle,
  UsersThree,
  VideoCamera,
  UploadSimple,
  CalendarX,
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
    href: "/semana",
    label: "Semana",
    description: "Revisão semanal e plano da próxima semana",
    icon: CalendarCheck,
  },
  {
    href: "/planejar",
    label: "Planejar",
    description: "Wizard semanal: revisão, tarefas, agenda e intenção",
    icon: ClipboardText,
  },
  {
    href: "/compromissos",
    label: "Compromissos",
    description: "Ledger de promessas verbais das reuniões",
    icon: Handshake,
  },
  {
    href: "/reunioes",
    label: "Reuniões",
    description: "Lista completa de reuniões gravadas",
    icon: VideoCamera,
  },
  {
    href: "/importar",
    label: "Importar",
    description: "Enviar gravações de áudio ou vídeo",
    icon: UploadSimple,
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
    href: "/ensaiar",
    label: "Ensaiar",
    description: "Roleplay de conversas difíceis com IA",
    icon: Sparkle,
  },
  {
    href: "/calendario",
    label: "Calendário",
    description: "Higiene e carga de reuniões na semana",
    icon: CalendarX,
  },
  {
    href: "/insights",
    label: "Insights",
    description: "Tendências e métricas das suas reuniões",
    icon: ChartLineUp,
  },
];

/** Ondas 41–50 — bibliotecas e hubs cross-meeting. */
export const NAV_LIBRARY_ITEMS: NavItem[] = [
  {
    href: "/biblioteca",
    label: "Biblioteca",
    description: "Porta de entrada para prep, notas e busca",
    icon: Books,
  },
  {
    href: "/prep",
    label: "Prep",
    description: "Briefings das próximas reuniões",
    icon: CalendarCheck,
  },
  {
    href: "/decisoes",
    label: "Decisões",
    description: "Registro de decisões cross-meeting",
    icon: Gavel,
  },
  {
    href: "/vistas",
    label: "Vistas",
    description: "Filtros salvos da lista de reuniões",
    icon: BookmarkSimple,
  },
  {
    href: "/comentarios",
    label: "Comentários",
    description: "Anotações na timeline cross-meeting",
    icon: ChatCircleDots,
  },
  {
    href: "/notas",
    label: "Notas",
    description: "Diário pessoal por reunião",
    icon: NotePencil,
  },
  {
    href: "/compartilhar",
    label: "Compartilhar",
    description: "Links read-only ativos e revogados",
    icon: LinkSimple,
  },
  {
    href: "/conhecimento",
    label: "Conhecimento",
    description: "Wiki viva com proveniência das reuniões",
    icon: BookOpen,
  },
  {
    href: "/busca",
    label: "Busca",
    description: "Pesquisar título e transcrições",
    icon: MagnifyingGlass,
  },
  {
    href: "/assistente",
    label: "Assistente",
    description: "Perguntas em linguagem natural cross-meeting",
    icon: ChatsCircle,
  },
  {
    href: "/follow-ups",
    label: "Follow-ups",
    description: "Rascunhos e envios pendentes",
    icon: EnvelopeSimple,
  },
  {
    href: "/atas",
    label: "Atas",
    description: "Documentos formais das reuniões",
    icon: FileText,
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

export const NAV_ITEMS: NavItem[] = [
  ...NAV_PRIMARY_ITEMS,
  ...NAV_LIBRARY_ITEMS,
  ...NAV_ACCOUNT_ITEMS,
];

function findLibraryNav(href: string): NavItem | undefined {
  return NAV_LIBRARY_ITEMS.find((item) => item.href === href);
}

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

  if (pathname === "/semana" || pathname.startsWith("/semana?")) {
    return NAV_ITEMS.find((item) => item.href === "/semana") ?? NAV_ITEMS[0];
  }

  if (pathname === "/planejar" || pathname.startsWith("/planejar?")) {
    return NAV_ITEMS.find((item) => item.href === "/planejar") ?? NAV_ITEMS[0];
  }

  if (pathname === "/compromissos" || pathname.startsWith("/compromissos?")) {
    return NAV_ITEMS.find((item) => item.href === "/compromissos") ?? NAV_ITEMS[0];
  }

  if (pathname === "/ensaiar" || pathname.startsWith("/ensaiar?")) {
    return NAV_ITEMS.find((item) => item.href === "/ensaiar") ?? NAV_ITEMS[0];
  }

  if (pathname === "/calendario" || pathname.startsWith("/calendario?")) {
    return NAV_ITEMS.find((item) => item.href === "/calendario") ?? NAV_ITEMS[0];
  }

  if (pathname === "/importar" || pathname.startsWith("/importar?")) {
    return NAV_ITEMS.find((item) => item.href === "/importar") ?? NAV_ITEMS[0];
  }

  if (pathname === "/speakers" || pathname.startsWith("/speakers/")) {
    return {
      href: "/speakers",
      label: "Speakers",
      description: "Mapeamento global de rótulos de transcrição",
      icon: NAV_ITEMS.find((item) => item.href === "/participantes")!.icon,
    };
  }

  if (pathname === "/series" || pathname.startsWith("/series/")) {
    return {
      href: "/series",
      label: "Séries",
      description: "Reuniões recorrentes e comparador",
      icon: NAV_ITEMS.find((item) => item.href === "/reunioes")!.icon,
    };
  }

  if (pathname === "/compare" || pathname.startsWith("/compare?")) {
    return {
      href: "/compare",
      label: "Comparar reuniões",
      description: "Diff entre duas ocorrências",
      icon: NAV_ITEMS.find((item) => item.href === "/reunioes")!.icon,
    };
  }

  if (pathname === "/destaques" || pathname.startsWith("/destaques/")) {
    return {
      href: "/destaques",
      label: "Destaques",
      description: "Momentos marcados nas reuniões",
      icon: NAV_ITEMS.find((item) => item.href === "/reunioes")!.icon,
    };
  }

  if (pathname === "/assistente" || pathname.startsWith("/assistente?")) {
    return findLibraryNav("/assistente") ?? NAV_ITEMS[0];
  }

  if (pathname === "/notificacoes" || pathname.startsWith("/notificacoes?")) {
    return {
      href: "/notificacoes",
      label: "Notificações",
      description: "Inbox de alertas e histórico",
      icon: NAV_ITEMS.find((item) => item.href === "/configuracoes")!.icon,
    };
  }

  if (pathname === "/participacao" || pathname.startsWith("/participacao?")) {
    return {
      href: "/participacao",
      label: "Participação",
      description: "Talk-time e equilíbrio de fala",
      icon: NAV_ITEMS.find((item) => item.href === "/insights")!.icon,
    };
  }

  if (pathname === "/integracoes" || pathname.startsWith("/integracoes/")) {
    return {
      href: "/integracoes",
      label: "Integrações",
      description: "Slack, Notion e webhooks",
      icon: NAV_ITEMS.find((item) => item.href === "/configuracoes")!.icon,
    };
  }

  if (pathname === "/automacoes" || pathname.startsWith("/automacoes")) {
    return {
      href: "/automacoes",
      label: "Automações",
      description: "Playbooks pós-reunião",
      icon: NAV_ITEMS.find((item) => item.href === "/configuracoes")!.icon,
    };
  }

  if (pathname === "/conhecimento" || pathname.startsWith("/conhecimento/")) {
    return findLibraryNav("/conhecimento") ?? NAV_ITEMS[0];
  }

  if (pathname === "/decisoes" || pathname.startsWith("/decisoes?")) {
    return findLibraryNav("/decisoes") ?? NAV_ITEMS[0];
  }

  if (pathname === "/prep" || pathname.startsWith("/prep?")) {
    return findLibraryNav("/prep") ?? NAV_ITEMS[0];
  }

  if (pathname === "/compartilhar" || pathname.startsWith("/compartilhar?")) {
    return findLibraryNav("/compartilhar") ?? NAV_ITEMS[0];
  }

  if (pathname === "/vistas" || pathname.startsWith("/vistas")) {
    return findLibraryNav("/vistas") ?? NAV_ITEMS[0];
  }

  if (pathname === "/comentarios" || pathname.startsWith("/comentarios?")) {
    return findLibraryNav("/comentarios") ?? NAV_ITEMS[0];
  }

  if (pathname === "/notas" || pathname.startsWith("/notas?")) {
    return findLibraryNav("/notas") ?? NAV_ITEMS[0];
  }

  if (pathname === "/biblioteca" || pathname.startsWith("/biblioteca")) {
    return findLibraryNav("/biblioteca") ?? NAV_ITEMS[0];
  }

  if (pathname === "/follow-ups" || pathname.startsWith("/follow-ups?")) {
    return findLibraryNav("/follow-ups") ?? NAV_ITEMS[0];
  }

  if (pathname === "/atas" || pathname.startsWith("/atas?")) {
    return findLibraryNav("/atas") ?? NAV_ITEMS[0];
  }

  if (pathname === "/busca" || pathname.startsWith("/busca?")) {
    return findLibraryNav("/busca") ?? NAV_ITEMS[0];
  }

  if (pathname === "/templates" || pathname.startsWith("/templates/")) {
    return {
      href: "/templates",
      label: "Templates",
      description: "Templates de análise pós-call",
      icon: NAV_ITEMS.find((item) => item.href === "/reunioes")!.icon,
    };
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
