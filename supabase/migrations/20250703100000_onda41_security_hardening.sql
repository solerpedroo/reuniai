-- Onda 41: reforço de RLS em comentários de reunião

drop policy if exists "meeting_comments_insert_own" on public.meeting_comments;

create policy "meeting_comments_insert_own"
  on public.meeting_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_meeting_owner(meeting_id)
  );
