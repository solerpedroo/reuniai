import type { createClient } from "@/lib/supabase/server";
import type { ActionItem } from "@/lib/supabase/types";
import { compareByPriorityAndDue } from "@/lib/action-items/priority";
import { getMeetingIdsByTag, getTagsForUser } from "@/lib/tags/queries";
import type { Tag } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export const INBOX_FILTERS = [
  "focus",
  "today",
  "overdue",
  "week",
  "all",
  "snoozed",
  "suggested",
] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export const INBOX_FILTER_LABELS: Record<InboxFilter, string> = {
  focus: "Foco",
  today: "Hoje",
  overdue: "Atrasados",
  week: "Esta semana",
  all: "Todos abertos",
  snoozed: "Adiadas",
  suggested: "Sugestões IA",
};

export type InboxActionItem = {
  id: string;
  action_item_id: string | null;
  meeting_id: string | null;
  user_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: ActionItem["status"];
  source: ActionItem["source"];
  priority: ActionItem["priority"];
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
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

type UserTaskRow = {
  id: string;
  action_item_id: string | null;
  meeting_id: string | null;
  user_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: ActionItem["status"];
  source: ActionItem["source"];
  priority: ActionItem["priority"];
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
  meetings: { title: string } | { title: string }[] | null;
};

function mapRow(row: UserTaskRow): InboxActionItem {
  const meeting = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
  return {
    id: row.id,
    action_item_id: row.action_item_id,
    meeting_id: row.meeting_id,
    user_id: row.user_id,
    title: row.title,
    assignee: row.assignee,
    due_date: row.due_date,
    status: row.status,
    source: row.source,
    priority: row.priority,
    snoozed_until: row.snoozed_until,
    created_at: row.created_at,
    updated_at: row.updated_at,
    meeting_title: meeting?.title ?? (row.meeting_id ? "Reunião" : "Tarefa avulsa"),
  };
}

async function fetchHubTasksWithMeetings(
  supabase: Client,
  status: ActionItem["status"] | ActionItem["status"][]
): Promise<InboxActionItem[]> {
  let query = supabase
    .from("user_tasks")
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

  return ((data ?? []) as UserTaskRow[]).map(mapRow);
}

function isSnoozed(item: InboxActionItem, now = new Date()): boolean {
  if (!item.snoozed_until) return false;
  return new Date(item.snoozed_until) > now;
}

function excludeSnoozed(items: InboxActionItem[], now = new Date()): InboxActionItem[] {
  return items.filter((item) => !isSnoozed(item, now));
}

function sortInboxItems(items: InboxActionItem[]): InboxActionItem[] {
  return [...items].sort(compareByPriorityAndDue);
}

function filterOpenByView(items: InboxActionItem[], filter: InboxFilter): InboxActionItem[] {
  const today = localDateIso();
  const activeItems = excludeSnoozed(items);

  switch (filter) {
    case "suggested":
      return items;
    case "snoozed":
      return items.filter((item) => isSnoozed(item));
    case "focus":
      return activeItems.filter(
        (item) =>
          item.priority === "high" && item.due_date != null && item.due_date <= today
      );
    case "overdue":
      return activeItems.filter((item) => item.due_date != null && item.due_date < today);
    case "today":
      return activeItems.filter((item) => item.due_date != null && item.due_date <= today);
    case "week": {
      const weekEnd = addDaysIso(today, 7);
      return activeItems.filter(
        (item) =>
          item.due_date != null && item.due_date >= today && item.due_date <= weekEnd
      );
    }
    case "all":
    default:
      return activeItems;
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
    fetchHubTasksWithMeetings(supabase, "open"),
    fetchHubTasksWithMeetings(supabase, "suggested"),
    getTagsForUser(supabase),
  ]);

  const allItems = [...openItems, ...suggestedItems];
  const meetingMap = new Map<string, string>();
  const assigneeSet = new Set<string>();

  for (const item of allItems) {
    if (item.meeting_id) {
      meetingMap.set(item.meeting_id, item.meeting_title);
    }
    if (item.assignee?.trim()) assigneeSet.add(item.assignee.trim());
  }

  const meetingIds = new Set(
    allItems.map((item) => item.meeting_id).filter((id): id is string => Boolean(id))
  );
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
    items = await fetchHubTasksWithMeetings(supabase, "suggested");
  } else {
    const openItems = await fetchHubTasksWithMeetings(supabase, "open");
    items = filterOpenByView(openItems, query.filter);
  }

  items = applyScopeFilters(items, query);

  if (query.tagId) {
    const meetingIds = await getMeetingIdsByTag(supabase, query.tagId);
    const allowed = new Set(meetingIds);
    items = items.filter((item) => item.meeting_id && allowed.has(item.meeting_id));
  }

  return sortInboxItems(items);
}

export async function getInboxCounts(supabase: Client): Promise<InboxCounts> {
  const [openItems, suggestedItems] = await Promise.all([
    fetchHubTasksWithMeetings(supabase, "open"),
    fetchHubTasksWithMeetings(supabase, "suggested"),
  ]);

  return {
    focus: filterOpenByView(openItems, "focus").length,
    today: filterOpenByView(openItems, "today").length,
    overdue: filterOpenByView(openItems, "overdue").length,
    week: filterOpenByView(openItems, "week").length,
    all: filterOpenByView(openItems, "all").length,
    snoozed: filterOpenByView(openItems, "snoozed").length,
    suggested: suggestedItems.length,
  };
}
