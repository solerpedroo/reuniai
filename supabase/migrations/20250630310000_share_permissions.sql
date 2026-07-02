-- Permissões granulares por link de compartilhamento
alter table public.share_tokens
  add column if not exists permissions jsonb;

update public.share_tokens
set permissions = case
  when scope = 'full_transcript' then
    '{"executive_summary":true,"topics":true,"decisions":true,"action_items":true,"participants":true,"transcript":true,"talk_time":true}'::jsonb
  else
    '{"executive_summary":true,"topics":true,"decisions":true,"action_items":true,"participants":false,"transcript":false,"talk_time":false}'::jsonb
end
where permissions is null;

alter table public.share_tokens
  alter column permissions set default
    '{"executive_summary":true,"topics":true,"decisions":true,"action_items":true,"participants":false,"transcript":false,"talk_time":false}'::jsonb;

alter table public.share_tokens
  alter column permissions set not null;
