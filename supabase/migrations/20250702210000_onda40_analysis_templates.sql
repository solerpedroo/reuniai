-- Onda 40: Biblioteca de templates de análise

create table if not exists public.analysis_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  sections jsonb not null default '[]'::jsonb,
  is_builtin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analysis_templates_builtin_slug_idx
  on public.analysis_templates (slug)
  where is_builtin = true;

create unique index if not exists analysis_templates_user_slug_idx
  on public.analysis_templates (user_id, slug)
  where user_id is not null;

create trigger analysis_templates_set_updated_at
  before update on public.analysis_templates
  for each row execute function public.set_updated_at();

alter table public.analysis_templates enable row level security;

create policy "analysis_templates_select_builtin_or_own"
  on public.analysis_templates for select to authenticated
  using (is_builtin = true or user_id = auth.uid());

create policy "analysis_templates_insert_own"
  on public.analysis_templates for insert to authenticated
  with check (is_builtin = false and user_id = auth.uid());

create policy "analysis_templates_update_own"
  on public.analysis_templates for update to authenticated
  using (is_builtin = false and user_id = auth.uid())
  with check (is_builtin = false and user_id = auth.uid());

create policy "analysis_templates_delete_own"
  on public.analysis_templates for delete to authenticated
  using (is_builtin = false and user_id = auth.uid());

-- Built-ins (read-only for all users)
insert into public.analysis_templates (user_id, slug, name, description, sections, is_builtin)
values
  (
    null,
    'generic',
    'Genérico',
    'Resumo equilibrado para qualquer tipo de reunião.',
    '[
      {"id":"executive_summary","label":"Resumo executivo","enabled":true},
      {"id":"topics","label":"Tópicos discutidos","enabled":true},
      {"id":"decisions","label":"Decisões","enabled":true},
      {"id":"action_items","label":"Próximos passos","enabled":true}
    ]'::jsonb,
    true
  ),
  (
    null,
    'standup',
    'Standup / Daily',
    'Ontem, hoje e blockers — sem ruído comercial.',
    '[
      {"id":"executive_summary","label":"Resumo","enabled":true},
      {"id":"yesterday","label":"Ontem","enabled":true},
      {"id":"today","label":"Hoje","enabled":true},
      {"id":"blockers","label":"Blockers","enabled":true},
      {"id":"action_items","label":"Ações","enabled":true}
    ]'::jsonb,
    true
  ),
  (
    null,
    'one_on_one',
    '1:1',
    'Feedback, compromissos e follow-ups pessoais.',
    '[
      {"id":"executive_summary","label":"Resumo","enabled":true},
      {"id":"discussion_topics","label":"Tópicos","enabled":true},
      {"id":"feedback","label":"Feedback","enabled":true},
      {"id":"commitments","label":"Compromissos","enabled":true},
      {"id":"action_items","label":"Ações","enabled":true}
    ]'::jsonb,
    true
  ),
  (
    null,
    'retrospective',
    'Retrospectiva',
    'O que foi bem e o que melhorar.',
    '[
      {"id":"executive_summary","label":"Resumo","enabled":true},
      {"id":"went_well","label":"O que foi bem","enabled":true},
      {"id":"to_improve","label":"A melhorar","enabled":true},
      {"id":"action_items","label":"Ações","enabled":true}
    ]'::jsonb,
    true
  ),
  (
    null,
    'sales',
    'Vendas / Demo',
    'Dores, objeções e próximos passos comerciais.',
    '[
      {"id":"executive_summary","label":"Resumo","enabled":true},
      {"id":"customer_pain_points","label":"Dores do cliente","enabled":true},
      {"id":"objections","label":"Objeções","enabled":true},
      {"id":"next_steps","label":"Próximos passos","enabled":true},
      {"id":"action_items","label":"Ações","enabled":true}
    ]'::jsonb,
    true
  )
on conflict do nothing;

create index if not exists analysis_templates_user_id_idx on public.analysis_templates (user_id);
