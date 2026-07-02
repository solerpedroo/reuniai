-- Permite ao usuário remover as próprias notificações in-app.
create policy "notifications_delete_own"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
