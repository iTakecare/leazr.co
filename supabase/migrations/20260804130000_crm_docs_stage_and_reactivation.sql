-- ============================================================================
-- CRM Acquisition — étape « En attente de documents » + segment de réactivation
--
-- 1) Les 62 dossiers en `internal_docs_requested` étaient mélangés aux
--    propositions envoyées. Ce n'est pas la même action commerciale : une
--    proposition attend une décision, un dossier en attente de documents attend
--    des pièces. Il lui faut son étape.
--
-- 2) Les 281 offres « sans suite » restent PERDUES — un pipeline ne doit
--    contenir que ce sur quoi on travaille. Mais leur motif passe de
--    `backfill_closed` à `no_response` : elles n'ont pas été refusées, elles
--    n'ont jamais été traitées. La nuance change complètement le reporting.
--    Les relançables (moins de 6 mois, client sans contrat) reçoivent un tag
--    `reactivation` que les séquences de la Phase 4 consommeront.
-- ============================================================================

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 1) Nouvelle étape, intercalée entre « Proposition envoyée » et « Négociation »
-- ---------------------------------------------------------------------------

-- Décaler les étapes suivantes pour libérer la position 5
update public.pipeline_stages set position = position + 1
 where key in ('negotiation', 'won', 'lost') and position >= 5;

insert into public.pipeline_stages (company_id, key, label, position, probability, color, is_won, is_lost, is_default)
select c.id, 'docs_pending', 'En attente de documents', 5, 70.0, '#f97316', false, false, false
  from public.companies c
 where not exists (
   select 1 from public.pipeline_stages ps
    where ps.company_id = c.id and ps.key = 'docs_pending'
 );

-- Les nouvelles sociétés héritent du jeu complet
create or replace function public.seed_default_pipeline_stages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pipeline_stages (company_id, key, label, position, probability, color, is_won, is_lost, is_default)
  values
    (new.id, 'new',          'Nouveau',                 1,  10.0, '#94a3b8', false, false, true),
    (new.id, 'contacted',    'Contacté',                2,  20.0, '#3b82f6', false, false, false),
    (new.id, 'qualified',    'Qualifié',                3,  40.0, '#6366f1', false, false, false),
    (new.id, 'proposal',     'Proposition envoyée',     4,  60.0, '#f59e0b', false, false, false),
    (new.id, 'docs_pending', 'En attente de documents', 5,  70.0, '#f97316', false, false, false),
    (new.id, 'negotiation',  'Négociation',             6,  85.0, '#8b5cf6', false, false, false),
    (new.id, 'won',          'Gagné',                   7, 100.0, '#22c55e', true,  false, false),
    (new.id, 'lost',         'Perdu',                   8,   0.0, '#ef4444', false, true,  false)
  on conflict (company_id, key) do nothing;
  return new;
end;
$$;

-- « Négociation » désigne désormais uniquement le passage chez le financeur,
-- donc une probabilité plus élevée qu'avant l'insertion de l'étape documents.
update public.pipeline_stages set probability = 85.0 where key = 'negotiation';

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 2) Basculer les dossiers concernés dans la nouvelle étape
-- ---------------------------------------------------------------------------

alter table public.opportunities disable trigger trg_opportunities_sync_stage;
alter table public.opportunities disable trigger trg_opportunities_log_stage;
alter table public.opportunities disable trigger trg_opportunities_updated_at;

-- @@SPLIT@@
with target as (
  select o.opportunity_id, o.company_id
    from public.offers o
   where o.opportunity_id is not null
     and o.workflow_status = 'internal_docs_requested'
     and o.converted_to_contract is not true
)
update public.opportunities opp
   set stage_id = ps.id
  from target t
  join public.pipeline_stages ps
    on ps.company_id = t.company_id and ps.key = 'docs_pending'
 where opp.id = t.opportunity_id
   and opp.status = 'open'
   and opp.stage_id is distinct from ps.id;

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 3) Requalifier les affaires « sans suite » : perdues, mais jamais traitées
-- ---------------------------------------------------------------------------

-- Attention : la correction de mapping précédente ne posait `backfill_closed`
-- que sur les opportunités dont l'étape CHANGEAIT. Celles déjà classées perdues
-- au premier backfill sont restées sans motif du tout — d'où le filtre sur
-- `is null` ici, sans lequel presque rien n'est requalifié.
update public.opportunities opp
   set lost_reason = case o.workflow_status
         -- Jamais traitées : ce n'est pas un refus, c'est une absence de suivi
         when 'without_follow_up' then 'no_response'
         -- Le financeur a dit non
         when 'leaser_rejected'   then 'financing_refused'
         else 'other'
       end
  from public.offers o
 where o.opportunity_id = opp.id
   and opp.status = 'lost'
   and (opp.lost_reason is null or opp.lost_reason = 'backfill_closed');

-- @@SPLIT@@
-- Segment de réactivation : affaires perdues faute de réponse, de moins de
-- 6 mois, dont le client n'a jamais signé chez nous. C'est là qu'il reste
-- quelque chose à aller chercher — les séquences de la Phase 4 partiront de ce tag.
update public.opportunities opp
   set tags = array(select distinct unnest(opp.tags || array['reactivation']))
 where opp.status = 'lost'
   and opp.lost_reason = 'no_response'
   and opp.updated_at > now() - interval '6 months'
   and not (opp.tags @> array['reactivation'])
   and not exists (
     select 1 from public.contracts ct where ct.client_id = opp.client_id
   );

-- @@SPLIT@@
alter table public.opportunities enable trigger trg_opportunities_sync_stage;
alter table public.opportunities enable trigger trg_opportunities_log_stage;
alter table public.opportunities enable trigger trg_opportunities_updated_at;
