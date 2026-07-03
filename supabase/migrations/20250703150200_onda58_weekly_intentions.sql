-- Onda 58: intenções semanais para o planejador

create table public.user_weekly_intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_key text not null,
  intention text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_weekly_intentions_user_week_unique unique (user_id, week_key)
);

create index user_weekly_intentions_user_id_idx
  on public.user_weekly_intentions (user_id);

create trigger user_weekly_intentions_set_updated_at
  before update on public.user_weekly_intentions
  for each row execute function public.set_updated_at();

alter table public.user_weekly_intentions enable row level security;

create policy "user_weekly_intentions_select_own"
  on public.user_weekly_intentions for select to authenticated
  using (user_id = auth.uid());

create policy "user_weekly_intentions_insert_own"
  on public.user_weekly_intentions for insert to authenticated
  with check (user_id = auth.uid());

create policy "user_weekly_intentions_update_own"
  on public.user_weekly_intentions for update to authenticated
  using (user_id = auth.uid());

create policy "user_weekly_intentions_delete_own"
  on public.user_weekly_intentions for delete to authenticated
  using (user_id = auth.uid());
