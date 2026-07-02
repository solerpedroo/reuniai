import "server-only";

import { countPersonalNotesLibrary } from "@/lib/meetings/personal-notes-library";
import { getDecisionRegistry } from "@/lib/decisions/registry";
import { getSavedViews } from "@/lib/meetings/filter-queries";
import { getShareLinksHub } from "@/lib/meetings/share-hub";
import type { LibraryHub, LibraryHubCard } from "@/lib/library/hub-types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type { LibraryHub, LibraryHubCard } from "@/lib/library/hub-types";

export async function getLibraryHub(supabase: Client): Promise<LibraryHub> {
  const now = new Date();
  const prepEnd = new Date(now);
  prepEnd.setDate(prepEnd.getDate() + 7);

  const [
    prepRes,
    highlightsRes,
    commentsRes,
    notesCount,
    savedViews,
    shareHub,
    templatesRes,
    decisionsRegistry,
  ] = await Promise.all([
    supabase
      .from("meetings")
      .select("*", { count: "exact", head: true })
      .gte("started_at", now.toISOString())
      .lte("started_at", prepEnd.toISOString())
      .in("status", ["scheduled", "bot_joining", "recording"]),
    supabase.from("meeting_highlights").select("*", { count: "exact", head: true }),
    supabase.from("meeting_comments").select("*", { count: "exact", head: true }),
    countPersonalNotesLibrary(supabase),
    getSavedViews(supabase),
    getShareLinksHub(supabase),
    supabase.from("analysis_templates").select("*", { count: "exact", head: true }),
    getDecisionRegistry(supabase, "30d"),
  ]);

  const cards: LibraryHubCard[] = [
    {
      href: "/prep",
      label: "Prep",
      description: "Briefings das próximas reuniões",
      count: prepRes.count ?? 0,
    },
    {
      href: "/decisoes",
      label: "Decisões",
      description: "Registro pesquisável",
      count: decisionsRegistry.totalDecisions,
    },
    {
      href: "/destaques",
      label: "Destaques",
      description: "Momentos marcados",
      count: highlightsRes.count ?? 0,
    },
    {
      href: "/comentarios",
      label: "Comentários",
      description: "Notas na timeline",
      count: commentsRes.count ?? 0,
    },
    {
      href: "/notas",
      label: "Notas pessoais",
      description: "Diário por reunião",
      count: notesCount,
    },
    {
      href: "/vistas",
      label: "Vistas",
      description: "Filtros salvos",
      count: savedViews.length,
    },
    {
      href: "/templates",
      label: "Templates",
      description: "Análise pós-call",
      count: templatesRes.count ?? 0,
    },
    {
      href: "/assistente",
      label: "Assistente",
      description: "Chat cross-meeting",
      count: 0,
    },
    {
      href: "/compartilhar",
      label: "Compartilhar",
      description: "Links read-only ativos",
      count: shareHub.activeCount,
    },
    {
      href: "/busca",
      label: "Busca",
      description: "Título e transcrições",
      count: 0,
    },
  ];

  return { cards };
}
