import "server-only";

import { generateAndSaveFollowUp } from "@/lib/meetings/follow-up";
import { matchesPlaybookConditions } from "@/lib/playbooks/matcher";
import type { Playbook, PlaybookAction, PlaybookRunLogEntry } from "@/lib/playbooks/types";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

function parsePlaybook(row: {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  conditions: unknown;
  actions: unknown;
}): Playbook {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    enabled: row.enabled,
    conditions: (row.conditions ?? {}) as Playbook["conditions"],
    actions: Array.isArray(row.actions) ? (row.actions as PlaybookAction[]) : [],
    created_at: "",
    updated_at: "",
  };
}

async function runAction(
  admin: AdminClient,
  meetingId: string,
  userId: string,
  action: PlaybookAction
): Promise<PlaybookRunLogEntry> {
  try {
    switch (action.type) {
      case "generate_follow_up": {
        const followUp = await generateAndSaveFollowUp(admin, meetingId);
        return {
          action: action.type,
          ok: Boolean(followUp),
          detail: followUp ? "Follow-up gerado" : "Follow-up não gerado",
        };
      }
      case "apply_tags": {
        const tagIds = action.tag_ids.filter(Boolean);
        if (tagIds.length === 0) {
          return { action: action.type, ok: false, detail: "Nenhuma tag configurada" };
        }

        const { data: ownedTags } = await admin
          .from("tags")
          .select("id")
          .eq("user_id", userId)
          .in("id", tagIds);

        const ownedIds = ((ownedTags ?? []) as { id: string }[]).map((t) => t.id);
        if (ownedIds.length === 0) {
          return { action: action.type, ok: false, detail: "Tags inválidas" };
        }

        await admin.from("meeting_tags").delete().eq("meeting_id", meetingId);
        await admin.from("meeting_tags").insert(
          ownedIds.map((tagId) => ({ meeting_id: meetingId, tag_id: tagId }))
        );

        return { action: action.type, ok: true, detail: `${ownedIds.length} tag(s) aplicada(s)` };
      }
      case "set_folder": {
        const { data: folder } = await admin
          .from("folders")
          .select("id")
          .eq("id", action.folder_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!folder) {
          return { action: action.type, ok: false, detail: "Pasta inválida" };
        }

        await admin.from("meeting_folders").delete().eq("meeting_id", meetingId);
        await admin.from("meeting_folders").insert({
          meeting_id: meetingId,
          folder_id: action.folder_id,
        });

        return { action: action.type, ok: true, detail: "Pasta aplicada" };
      }
      default:
        return { action: "unknown", ok: false, detail: "Ação desconhecida" };
    }
  } catch (err) {
    return {
      action: action.type,
      ok: false,
      detail: err instanceof Error ? err.message.slice(0, 200) : "Erro",
    };
  }
}

export async function runPlaybooksForMeeting(
  admin: AdminClient,
  meetingId: string
): Promise<number> {
  const { data: meeting } = await admin
    .from("meetings")
    .select(
      "id, user_id, title, platform, calendar_recurring_event_id, analysis_template"
    )
    .eq("id", meetingId)
    .maybeSingle<{
      id: string;
      user_id: string;
      title: string;
      platform: string | null;
      calendar_recurring_event_id: string | null;
      analysis_template: string | null;
    }>();

  if (!meeting) return 0;

  const { data: rows } = await admin
    .from("playbooks")
    .select("id, user_id, name, enabled, conditions, actions")
    .eq("user_id", meeting.user_id)
    .eq("enabled", true);

  let ran = 0;

  for (const row of rows ?? []) {
    const playbook = parsePlaybook(row as Parameters<typeof parsePlaybook>[0]);
    if (!matchesPlaybookConditions(meeting, playbook.conditions)) continue;
    if (playbook.actions.length === 0) continue;

    const log: PlaybookRunLogEntry[] = [];
    for (const action of playbook.actions) {
      log.push(await runAction(admin, meetingId, meeting.user_id, action));
    }

    const okCount = log.filter((e) => e.ok).length;
    const status =
      okCount === log.length ? "success" : okCount === 0 ? "failed" : "partial";

    await admin.from("playbook_runs").insert({
      playbook_id: playbook.id,
      meeting_id: meetingId,
      status,
      log: log as unknown as never,
    });

    ran += 1;
  }

  return ran;
}
