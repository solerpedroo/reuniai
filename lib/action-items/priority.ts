import type { ActionItem } from "@/lib/supabase/types";

export type ActionItemPriority = ActionItem["priority"];

export const PRIORITY_LABELS: Record<ActionItemPriority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export const PRIORITY_SHORT: Record<ActionItemPriority, string> = {
  high: "P1",
  medium: "P2",
  low: "P3",
};

const PRIORITY_WEIGHT: Record<ActionItemPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function compareByPriorityAndDue<
  T extends { priority: ActionItemPriority; due_date: string | null; created_at: string },
>(a: T, b: T): number {
  const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
  if (a.due_date) return -1;
  if (b.due_date) return 1;

  return b.created_at.localeCompare(a.created_at);
}

export function snoozeUntilFromPreset(
  preset: "tomorrow" | "next_week",
  now = new Date()
): string {
  const result = new Date(now);
  result.setHours(9, 0, 0, 0);

  if (preset === "tomorrow") {
    result.setDate(result.getDate() + 1);
  } else {
    result.setDate(result.getDate() + 7);
  }

  return result.toISOString();
}
