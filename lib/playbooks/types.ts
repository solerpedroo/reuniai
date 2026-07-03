export type PlaybookConditions = {
  title_contains?: string;
  series_id?: string;
  template_id?: string;
  platform?: string;
};

export type PlaybookAction =
  | { type: "generate_follow_up" }
  | { type: "apply_tags"; tag_ids: string[] }
  | { type: "set_folder"; folder_id: string };

export type Playbook = {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  conditions: PlaybookConditions;
  actions: PlaybookAction[];
  created_at: string;
  updated_at: string;
};

export type PlaybookRunLogEntry = {
  action: string;
  ok: boolean;
  detail?: string;
};

export type PlaybookRun = {
  id: string;
  playbook_id: string;
  meeting_id: string;
  status: "success" | "partial" | "failed";
  log: PlaybookRunLogEntry[];
  created_at: string;
};

export const PLAYBOOK_PRESETS: {
  name: string;
  conditions: PlaybookConditions;
  actions: PlaybookAction[];
}[] = [
  {
    name: "1:1 — follow-up automático",
    conditions: { title_contains: "1:1" },
    actions: [{ type: "generate_follow_up" }],
  },
  {
    name: "Standup — sem follow-up",
    conditions: { title_contains: "standup" },
    actions: [],
  },
];
