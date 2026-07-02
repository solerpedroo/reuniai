-- Onda 24: pastas para organizar reuniões

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#0064F5',
  parent_id uuid references public.folders (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint folders_user_name_unique unique (user_id, name)
);

create index folders_user_id_idx on public.folders (user_id);

create table public.meeting_folders (
  meeting_id uuid primary key references public.meetings (id) on delete cascade,
  folder_id uuid not null references public.folders (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index meeting_folders_folder_id_idx on public.meeting_folders (folder_id);

alter table public.folders enable row level security;
alter table public.meeting_folders enable row level security;

create policy "folders_select_own"
  on public.folders for select to authenticated
  using (user_id = (select auth.uid()));

create policy "folders_insert_own"
  on public.folders for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "folders_update_own"
  on public.folders for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "folders_delete_own"
  on public.folders for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "meeting_folders_select_own"
  on public.meeting_folders for select to authenticated
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_folders.meeting_id
        and m.user_id = (select auth.uid())
    )
  );

create policy "meeting_folders_insert_own"
  on public.meeting_folders for insert to authenticated
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_folders.meeting_id
        and m.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.folders f
      where f.id = meeting_folders.folder_id
        and f.user_id = (select auth.uid())
    )
  );

create policy "meeting_folders_update_own"
  on public.meeting_folders for update to authenticated
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_folders.meeting_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.folders f
      where f.id = meeting_folders.folder_id
        and f.user_id = (select auth.uid())
    )
  );

create policy "meeting_folders_delete_own"
  on public.meeting_folders for delete to authenticated
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_folders.meeting_id
        and m.user_id = (select auth.uid())
    )
  );
