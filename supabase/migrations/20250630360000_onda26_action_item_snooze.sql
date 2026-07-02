-- Onda 26: prioridade e snooze em action items

create type public.action_item_priority as enum ('low', 'medium', 'high');

alter table public.action_items
  add column if not exists priority public.action_item_priority not null default 'medium',
  add column if not exists snoozed_until timestamptz;

create index if not exists action_items_open_snooze_idx
  on public.action_items (user_id, snoozed_until)
  where status = 'open';

create index if not exists action_items_open_priority_idx
  on public.action_items (user_id, priority)
  where status = 'open';
