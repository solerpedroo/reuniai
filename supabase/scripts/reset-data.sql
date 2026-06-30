-- ===========================================================================
-- Reset de dados para teste limpo (ReuniAI)
-- ===========================================================================
-- ATENÇÃO: este script APAGA TODOS OS DADOS das tabelas da aplicação.
-- Use apenas em ambiente de desenvolvimento/teste. NÃO rode em produção real
-- com dados que você queira manter.
--
-- Como rodar:
--   • Supabase Studio → SQL Editor → cole e execute, OU
--   • supabase db execute --file supabase/scripts/reset-data.sql (CLI), OU
--   • psql "$DATABASE_URL" -f supabase/scripts/reset-data.sql
--
-- O trigger on_auth_user_created recria o profile automaticamente quando você
-- cadastrar a nova conta — não é preciso semear nada manualmente.
-- ===========================================================================

begin;

-- 1) Limpa todos os dados da aplicação (CASCADE cobre dependências e órfãos).
truncate table
  public.webhook_deliveries,
  public.outbound_webhooks,
  public.notion_connections,
  public.slack_connections,
  public.series_analysis_defaults,
  public.speaker_mappings,
  public.meeting_highlights,
  public.meeting_comments,
  public.export_audit,
  public.push_subscriptions,
  public.notifications,
  public.meeting_prep_cards,
  public.meeting_follow_ups,
  public.share_tokens,
  public.meeting_tags,
  public.tags,
  public.webhook_events,
  public.transcript_embeddings,
  public.chat_messages,
  public.action_items,
  public.meeting_summaries,
  public.transcript_segments,
  public.participants,
  public.meetings,
  public.calendar_connections,
  public.profiles
restart identity cascade;

-- 2) Remove TODAS as contas existentes (auth). O cascade já esvaziou as tabelas
--    acima; isto garante um cadastro 100% novo sem usuários antigos.
--    >>> Se quiser MANTER sua conta atual, comente a linha abaixo. <<<
delete from auth.users;

commit;
