-- P0 (préventif) : support_tickets / ticket_replies avaient une policy "Company members"
-- scopée société qu'un CLIENT satisfait → il aurait vu tous les tickets/réponses des
-- autres clients dès qu'il y en aurait. Gating NOT is_client_user() ; le client garde
-- ses propres tickets via les policies "Clients can read own". Appliqué via execute_sql.
alter policy "Company members can read tickets" on public.support_tickets
  using ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid())) AND NOT public.is_client_user());
alter policy "Company members can read ticket replies" on public.ticket_replies
  using ((EXISTS (SELECT 1 FROM support_tickets st JOIN profiles p ON p.company_id = st.company_id WHERE st.id = ticket_replies.ticket_id AND p.id = auth.uid())) AND NOT public.is_client_user());
