import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Folder = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  parent_id: string | null;
  created_at: string;
};

export type FolderWithCount = Folder & { meetingCount: number };

export async function getFoldersForUser(supabase: Client): Promise<FolderWithCount[]> {
  const { data: folders, error } = await supabase
    .from("folders")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  const rows = (folders ?? []) as Folder[];
  if (rows.length === 0) return [];

  const { data: links, error: linkError } = await supabase
    .from("meeting_folders")
    .select("folder_id");

  if (linkError) throw linkError;

  const countMap = new Map<string, number>();
  for (const row of links ?? []) {
    const folderId = (row as { folder_id: string }).folder_id;
    countMap.set(folderId, (countMap.get(folderId) ?? 0) + 1);
  }

  return rows.map((folder) => ({
    ...folder,
    meetingCount: countMap.get(folder.id) ?? 0,
  }));
}

export async function getMeetingIdsByFolder(
  supabase: Client,
  folderId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("meeting_folders")
    .select("meeting_id")
    .eq("folder_id", folderId);

  if (error) throw error;
  return new Set(((data ?? []) as { meeting_id: string }[]).map((row) => row.meeting_id));
}

export async function getMeetingIdsWithoutFolder(supabase: Client): Promise<Set<string>> {
  const { data: allMeetings, error: meetingsError } = await supabase
    .from("meetings")
    .select("id");

  if (meetingsError) throw meetingsError;

  const { data: assigned, error: assignedError } = await supabase
    .from("meeting_folders")
    .select("meeting_id");

  if (assignedError) throw assignedError;

  const assignedSet = new Set(
    ((assigned ?? []) as { meeting_id: string }[]).map((row) => row.meeting_id)
  );

  return new Set(
    ((allMeetings ?? []) as { id: string }[])
      .map((row) => row.id)
      .filter((id) => !assignedSet.has(id))
  );
}

export async function getFolderIdForMeeting(
  supabase: Client,
  meetingId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("meeting_folders")
    .select("folder_id")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  if (error) throw error;
  return (data as { folder_id: string } | null)?.folder_id ?? null;
}
