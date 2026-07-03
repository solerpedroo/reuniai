import "server-only";

import type { Playbook, PlaybookRun } from "@/lib/playbooks/types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

function mapPlaybook(row: Record<string, unknown>): Playbook {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    enabled: row.enabled as boolean,
    conditions: (row.conditions ?? {}) as Playbook["conditions"],
    actions: Array.isArray(row.actions) ? (row.actions as Playbook["actions"]) : [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listPlaybooks(supabase: Client): Promise<Playbook[]> {
  const { data, error } = await supabase
    .from("playbooks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapPlaybook(row as Record<string, unknown>));
}

export async function listRecentPlaybookRuns(
  supabase: Client,
  limit = 20
): Promise<(PlaybookRun & { playbook_name: string; meeting_title: string })[]> {
  const { data: runs, error } = await supabase
    .from("playbook_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!runs || runs.length === 0) return [];

  const playbookIds = [...new Set((runs as { playbook_id: string }[]).map((r) => r.playbook_id))];
  const meetingIds = [...new Set((runs as { meeting_id: string }[]).map((r) => r.meeting_id))];

  const [{ data: playbooks }, { data: meetings }] = await Promise.all([
    supabase.from("playbooks").select("id, name").in("id", playbookIds),
    supabase.from("meetings").select("id, title").in("id", meetingIds),
  ]);

  const playbookNames = new Map(
    ((playbooks ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
  );
  const meetingTitles = new Map(
    ((meetings ?? []) as { id: string; title: string }[]).map((m) => [m.id, m.title])
  );

  return (runs as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    playbook_id: row.playbook_id as string,
    meeting_id: row.meeting_id as string,
    status: row.status as PlaybookRun["status"],
    log: (row.log ?? []) as PlaybookRun["log"],
    created_at: row.created_at as string,
    playbook_name: playbookNames.get(row.playbook_id as string) ?? "Playbook",
    meeting_title: meetingTitles.get(row.meeting_id as string) ?? "Reunião",
  }));
}
