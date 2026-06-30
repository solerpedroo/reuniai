import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { recordingStoragePath } from "@/lib/supabase/types";
import { isSupabaseRecordingPath } from "@/lib/meetings/recording-source";

type AdminClient = ReturnType<typeof createAdminClient>;

const RECORDINGS_BUCKET = "recordings";

type MeetingRow = {
  id: string;
  user_id: string;
  recording_path: string | null;
};

async function removeRecordingFiles(
  admin: AdminClient,
  meeting: MeetingRow
): Promise<void> {
  const paths = new Set<string>();

  if (meeting.recording_path && isSupabaseRecordingPath(meeting.recording_path)) {
    paths.add(meeting.recording_path);
  }

  paths.add(recordingStoragePath(meeting.user_id, meeting.id));

  const folder = `${meeting.user_id}/${meeting.id}`;
  const { data: listed } = await admin.storage.from(RECORDINGS_BUCKET).list(folder);

  for (const file of listed ?? []) {
    if (file.name) {
      paths.add(`${folder}/${file.name}`);
    }
  }

  const toRemove = [...paths];
  if (toRemove.length === 0) return;

  const { error } = await admin.storage.from(RECORDINGS_BUCKET).remove(toRemove);
  if (error) {
    console.warn(`Falha ao remover gravação da reunião ${meeting.id}:`, error.message);
  }
}

/** Remove gravação no Storage e linha da reunião (cascade nos filhos). */
export async function deleteMeetingById(
  admin: AdminClient,
  meetingId: string
): Promise<{ deleted: boolean }> {
  const { data: meeting, error } = await admin
    .from("meetings")
    .select("id, user_id, recording_path")
    .eq("id", meetingId)
    .maybeSingle<MeetingRow>();

  if (error) throw error;
  if (!meeting) return { deleted: false };

  await removeRecordingFiles(admin, meeting);

  const { error: deleteError } = await admin.from("meetings").delete().eq("id", meetingId);
  if (deleteError) throw deleteError;

  return { deleted: true };
}

/** Remove todas as reuniões de um usuário (Storage + DB). */
export async function deleteAllMeetingsForUser(
  admin: AdminClient,
  userId: string
): Promise<number> {
  const { data: meetings, error } = await admin
    .from("meetings")
    .select("id, user_id, recording_path")
    .eq("user_id", userId);

  if (error) throw error;

  let deleted = 0;
  for (const meeting of meetings ?? []) {
    await removeRecordingFiles(admin, meeting);
    deleted += 1;
  }

  if (deleted > 0) {
    const { error: deleteError } = await admin.from("meetings").delete().eq("user_id", userId);
    if (deleteError) throw deleteError;
  }

  return deleted;
}
