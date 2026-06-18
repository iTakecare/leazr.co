-- P0 SÉCURITÉ : profiles_company_read (SELECT) laissait un client voir TOUS les profils
-- du staff de la société (emails/rôles). Gating de la branche société par NOT is_client_user().
-- Les policies "own" (auth.uid() = id) restent → l'auth du client n'est pas affectée
-- (get_user_company_id/is_admin_optimized sont SECURITY DEFINER, bypassent cette RLS).
-- Appliqué en prod via execute_sql.
alter policy profiles_company_read on public.profiles
  using (((company_id IN (SELECT p.company_id FROM get_current_user_profile() p(user_id, company_id, role))) AND NOT public.is_client_user())
         OR (EXISTS (SELECT 1 FROM get_current_user_profile() p(user_id, company_id, role) WHERE p.role = ANY (ARRAY['admin','super_admin']))));
