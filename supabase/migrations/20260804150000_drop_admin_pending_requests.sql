-- Suppression de admin_pending_requests : projection morte de offers + clients.
--
-- La table ne contenait aucune donnée propre : uniquement une copie de `offers`
-- jointe à `clients`, filtrée sur status IN ('pending','sent','approved') et
-- workflow_status IS NOT NULL. Elle n'est lue nulle part — vérifié sur la base
-- de production le 04/08/2026 :
--   * aucune référence dans src/ ni dans supabase/functions/ (hors le type
--     généré dans src/integrations/supabase/types.ts) ;
--   * aucune vue ni vue matérialisée ne la mentionne (pg_get_viewdef) ;
--   * aucune autre fonction SQL que les deux supprimées ici (pg_proc.prosrc) ;
--   * aucun job pg_cron ; aucune clé étrangère entrante ; aucun index ;
--   * `git log --all -S "from('admin_pending_requests')"` est vide : elle n'a
--     jamais été interrogée depuis le front, à aucun moment de l'historique.
--
-- Elle était maintenue par deux triggers FOR EACH ROW — sur offers (INSERT,
-- UPDATE, DELETE) et sur clients (UPDATE) — appelant tous deux
-- refresh_admin_pending_requests(), qui VIDE puis RECONSTRUIT la table entière
-- à chaque ligne touchée. Coût relevé dans pg_stat_user_tables : 9 592 395
-- lignes supprimées et 9 592 715 insérées pour maintenir 626 lignes utiles,
-- soit ~21 300 reconstructions complètes — exactement le nombre de seq_scan de
-- la table, ce qui confirme que ces balayages viennent du DELETE de la fonction
-- et non de lectures. Conséquence pratique : toute mise à jour groupée dépassait
-- le statement_timeout (constaté lors du backfill CRM du 04/08/2026), et chaque
-- enregistrement d'offre en production payait une reconstruction intégrale.
--
-- Effet de bord corrigé au passage : la table n'avait pas de company_id et son
-- unique policy RLS était `is_admin_optimized()`. N'importe quel admin, quel que
-- soit son tenant, y voyait donc les offres de tous les tenants. La supprimer
-- ferme cette fuite inter-tenants.
--
-- Réversible sans perte : le contenu se recalcule intégralement depuis offers +
-- clients. Requête d'origine conservée pour mémoire :
--
--   SELECT o.id, o.user_id, o.client_id, o.client_name, o.client_email,
--          c.email AS client_contact_email, c.company AS client_company,
--          o.amount, o.coefficient, o.monthly_payment, o.commission,
--          o.equipment_description, o.status, o.workflow_status,
--          o.converted_to_contract, o.created_at, o.updated_at
--     FROM public.offers o
--     LEFT JOIN public.clients c ON o.client_id = c.id
--    WHERE o.status IN ('pending','sent','approved')
--      AND o.workflow_status IS NOT NULL;
--
-- Appliqué en prod via scripts/apply-drop-admin-pending-requests.mjs
-- (historique des migrations désynchronisé — pas de `supabase db push`).

DROP TRIGGER IF EXISTS refresh_admin_pending_requests_on_offers ON public.offers;
DROP TRIGGER IF EXISTS refresh_admin_pending_requests_on_clients ON public.clients;

-- Sans CASCADE : les deux triggers ci-dessus étaient les seuls dépendants
-- connus. Si un objet inattendu dépendait encore de ces fonctions ou de la
-- table, on veut une erreur franche plutôt qu'une suppression silencieuse.
DROP FUNCTION IF EXISTS public.trigger_refresh_admin_pending_requests();
DROP FUNCTION IF EXISTS public.refresh_admin_pending_requests();

DROP TABLE IF EXISTS public.admin_pending_requests;
