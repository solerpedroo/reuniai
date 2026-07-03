export type TaskSyncProvider = "todoist" | "google_tasks";

export type TaskSyncConnectionRow = {
  id: string;
  user_id: string;
  provider: TaskSyncProvider;
  external_account_label: string | null;
  enabled: boolean;
  last_synced_at: string | null;
};

export type ActionItemForSync = {
  id: string;
  user_id: string;
  meeting_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: string;
};
