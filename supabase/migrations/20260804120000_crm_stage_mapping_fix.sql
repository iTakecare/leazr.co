-- ============================================================================
-- CRM Acquisition — correction du mapping des étapes
--
-- Le premier backfill se basait sur une liste de workflow_status devinée depuis
-- le code, pas sur les valeurs réelles. Résultat mesuré sur les 964 offres :
--
--   * `contract_signed` (8) avait été écrit `contract_sent` → fourre-tout
--   * `invoicing` (101) — facturé, donc VENDU — atterrissait en « Qualifié »
--   * `converted_to_contract` (339 offres) n'était pas regardé du tout
--   * `draft` tombait en « Qualifié » au lieu de « Nouveau »
--
-- D'où des affaires signées et facturées assises au milieu du pipeline
-- (cas signalé : Patrick Grasseels, ITC-2025-OFF-7169, contrat en cours).
--
-- Règle maîtresse : `converted_to_contract` ou l'existence d'un contrat prime
-- sur tout le reste. Une affaire convertie est gagnée, point.
--
-- Les triggers de opportunities sont neutralisés : on écrit stage_id, status et
-- les dates nous-mêmes, sinon 964 lignes = 964 requêtes (statement timeout) et
-- autant de faux « changements d'étape » dans la timeline.
-- ============================================================================

-- @@SPLIT@@
alter table public.opportunities disable trigger trg_opportunities_sync_stage;
alter table public.opportunities disable trigger trg_opportunities_log_stage;
alter table public.opportunities disable trigger trg_opportunities_updated_at;

-- @@SPLIT@@
with target as (
  select
    o.opportunity_id,
    -- company_id remonte dans la CTE : la table cible d'un UPDATE ne peut pas
    -- être référencée dans la condition de jointure du FROM.
    o.company_id,
    case
      -- 1) Vendu : le contrat fait foi, quel que soit le workflow_status
      when o.converted_to_contract is true
        or exists (select 1 from public.contracts ct where ct.offer_id = o.id)
        then 'won'
      -- 2) Statuts terminaux côté vente
      when o.workflow_status in (
             'financed','invoicing','contract_signed','contract_sent','accepted',
             'signed','completed','validated','leaser_approved')
        then 'won'
      -- 3) Affaires mortes
      when o.workflow_status in (
             'without_follow_up','internal_rejected','leaser_rejected','rejected',
             'refused','cancelled')
        then 'lost'
      -- 4) Chez le financeur
      when o.workflow_status in (
             'internal_approved','leaser_introduced','leaser_pending','leaser_docs_requested')
        then 'negotiation'
      -- 5) Proposition chez le client
      when o.workflow_status in (
             'sent','sent_to_client','viewed','info_requested','internal_docs_requested')
        then 'proposal'
      -- 6) Pas encore travaillé — y compris tout statut inconnu : on ne place
      --    JAMAIS une offre non identifiée au milieu du pipeline.
      else 'new'
    end as stage_key
  from public.offers o
  where o.opportunity_id is not null
)
update public.opportunities opp
   set stage_id = ps.id,
       status = case when ps.is_won then 'won' when ps.is_lost then 'lost' else 'open' end,
       won_at = case when ps.is_won then coalesce(opp.won_at, opp.updated_at) else null end,
       lost_at = case when ps.is_lost then coalesce(opp.lost_at, opp.updated_at) else null end,
       -- Une affaire close n'a plus de prochaine action à planifier
       next_action_at = case when ps.is_won or ps.is_lost then null else opp.next_action_at end,
       lost_reason = case
         when ps.is_lost and opp.lost_reason is null then 'backfill_closed'
         else opp.lost_reason end
  from target t
  join public.pipeline_stages ps
    on ps.company_id = t.company_id and ps.key = t.stage_key
 where opp.id = t.opportunity_id
   and opp.stage_id is distinct from ps.id;

-- @@SPLIT@@
alter table public.opportunities enable trigger trg_opportunities_sync_stage;
alter table public.opportunities enable trigger trg_opportunities_log_stage;
alter table public.opportunities enable trigger trg_opportunities_updated_at;
