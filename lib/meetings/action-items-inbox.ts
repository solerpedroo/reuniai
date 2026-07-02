import type { createClient } from "@/lib/supabase/server";
import type { ActionItem } from "@/lib/supabase/types";
import { getMeetingIdsByTag, getTagsForUser } from "@/lib/tags/queries";
import type { Tag } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export const INBOX_FILTERS = ["today", "overdue", "week", "all", "suggested"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export const INBOX_FILTER_LABELS: Record<InboxFilter, string> = {
  today: "Hoje",
  overdue: "Atrasados",
  week: "Esta semana",
  all: "Todos abertos",
  suggested: "Sugestões IA",
};

export type InboxActionItem = ActionItem & {
  meeting_title: string;
};

export type InboxCounts = Record<InboxFilter, number>;

export type InboxScope = {
  meetingId?: string;
  assignee?: string;
  tagId?: string;
};

export type InboxQuery = InboxScope & {
  filter: InboxFilter;
};

export type InboxMeetingOption = {
  id: string;
  title: string;
};

export type InboxFilterOptions = {
  meetings: InboxMeetingOption[];
  assignees: string[];
  tags: Tag[];
};

function localDateIso(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysIso(iso: string, days: number): string {
  const base = new Date(`${iso}T12:00:00`);
  base.setDate(base.getDate() + days);
  return localDateIso(base);
}

type ActionItemRow = ActionItem & {
  meetings: { title: string } | { title: string }[] | null;
};

function mapRow(row: ActionItemRow): InboxActionItem {
  const meeting = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
  return {
    id: row.id,
    meeting_id: row.meeting_id,
    user_id: row.user_id,
    title: row.title,
    assignee: row.assignee,
    due_date: row.due_date,
    status: row.status,
    source: row.source,
    created_at: row.created_at,
    updated_at: row.updated_at,
    meeting_title: meeting?.title ?? "Reunião",
  };
}

async function fetchActionItemsWithMeetings(
  supabase: Client,
  status: ActionItem["status"] | ActionItem["status"][]
): Promise<InboxActionItem[]> {
  let query = supabase
    .from("action_items")
    .select("*, meetings(title)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (Array.isArray(status)) {
    query = query.in("status", status);
  } else {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as ActionItemRow[]).map(mapRow);
}

function filterOpenByView(items: InboxActionItem[], filter: InboxFilter): InboxActionItem[] {
  const today = localDateIso();

  switch (filter) {
    case "suggested":
      return items;
    case "overdue":
      return items.filter((item) => item.due_date != null && item.due_date < today);
    case "today":
      return items.filter((item) => item.due_date != null && item.due_date <= today);
    case "week": {
      const weekEnd = addDaysIso(today, 7);
      return items.filter(
        (item) =>
          item.due_date != null && item.due_date >= today && item.due_date <= weekEnd
      );
    }
    case "all":
    default:
      return items;
  }
}

function applyScopeFilters(items: InboxActionItem[], scope: InboxScope): InboxActionItem[] {
  let result = items;

  if (scope.meetingId) {
    result = result.filter((item) => item.meeting_id === scope.meetingId);
  }

  if (scope.assignee) {
    result = result.filter(
      (item) => item.assignee?.toLowerCase() === scope.assignee!.toLowerCase()
    );
  }

  return result;
}

export function parseInboxFilter(value: string | undefined): InboxFilter {
  if (value && INBOX_FILTERS.includes(value as InboxFilter)) {
    return value as InboxFilter;
  }
  return "today";
}

export function parseInboxScope(params: {
  reuniao?: string;
  responsavel?: string;
  tag?: string;
}): InboxScope {
  return {
    meetingId: params.reuniao?.trim() || undefined,
    assignee: params.responsavel?.trim() || undefined,
    tagId: params.tag?.trim() || undefined,
  };
}

export function parseInboxQuery(params: {
  filtro?: string;
  reuniao?: string;
  responsavel?: string;
  tag?: string;
}): InboxQuery {
  return {
    filter: parseInboxFilter(params.filtro),
    ...parseInboxScope(params),
  };
}

export function inboxHref(query: InboxQuery): string {
  const params = new URLSearchParams();
  if (query.filter !== "today") params.set("filtro", query.filter);
  if (query.meetingId) params.set("reuniao", query.meetingId);
  if (query.assignee) params.set("responsavel", query.assignee);
  if (query.tagId) params.set("tag", query.tagId);
  const qs = params.toString();
  return qs ? `/tarefas?${qs}` : "/tarefas";
}

export function actionItemsKpiHref(counts: InboxCounts, openTotal: number): string | undefined {
  if (openTotal <= 0) return undefined;
  return counts.today > 0 ? "/tarefas" : "/tarefas?filtro=all";
}

export async function getInboxFilterOptions(supabase: Client): Promise<InboxFilterOptions> {
  const [openItems, suggestedItems, tags] = await Promise.all([
    fetchActionItemsWithMeetings(supabase, "open"),
    fetchActionItemsWithMeetings(supabase, "suggested"),
    getTagsForUser(supabase),
  ]);

  const allItems = [...openItems, ...suggestedItems];
  const meetingMap = new Map<string, string>();
  const assigneeSet = new Set<string>();

  for (const item of allItems) {
    meetingMap.set(item.meeting_id, item.meeting_title);
    if (item.assignee?.trim()) assigneeSet.add(item.assignee.trim());
  }

  const meetingIds = new Set(allItems.map((item) => item.meeting_id));
  const relevantTags = tags.filter((tag) => tag.meetingCount > 0);

  return {
    meetings: [...meetingMap.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    assignees: [...assigneeSet].sort((a, b) => a.localeCompare(b, "pt-BR")),
    tags: relevantTags.filter((tag) => {
      // keep tags that might have meetings with action items (approximation via meetingCount)
      return meetingIds.size === 0 || tag.meetingCount > 0;
    }),
  };
}

export async function getInboxActionItems(
  supabase: Client,
  query: InboxQuery
): Promise<InboxActionItem[]> {
  let items: InboxActionItem[];

  if (query.filter === "suggested") {
    items = await fetchActionItemsWithMeetings(supabase, "suggested");
  } else {
    const openItems = await fetchActionItemsWithMeetings(supabase, "open");
    items = filterOpenByView(openItems, query.filter);
  }

  items = applyScopeFilters(items, query);

  if (query.tagId) {
    const meetingIds = await getMeetingIdsByTag(supabase, query.tagId);
    const allowed = new Set(meetingIds);
    items = items.filter((item) => allowed.has(item.meeting_id));
  }

  return items;
}

export async function getInboxCounts(supabase: Client): Promise<InboxCounts> {
  const [openItems, suggestedItems] = await Promise.all([
    fetchActionItemsWithMeetings(supabase, "open"),
    fetchActionItemsWithMeetings(supabase, "suggested"),
  ]);

  return {
    today: filterOpenByView(openItems, "today").length,
    overdue: filterOpenByView(openItems, "overdue").length,
    week: filterOpenByView(openItems, "week").length,
    all: openItems.length,
    suggested: suggestedItems.length,
  };
}
