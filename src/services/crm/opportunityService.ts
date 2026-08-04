import { db } from './crmClient';
import { getDefaultStage } from './pipelineService';
import type {
  Opportunity,
  OpportunityFilters,
  OpportunityWithRelations,
  CrmChannel,
} from './types';

const SELECT_WITH_RELATIONS = `
  *,
  stage:pipeline_stages!opportunities_stage_id_fkey (id, key, label, color, probability, is_won, is_lost),
  client:clients!opportunities_client_id_fkey (id, name, company, email, vat_number, phone, address, postal_code, city, country),
  contact:contacts!opportunities_primary_contact_id_fkey (id, first_name, last_name, email, phone),
  owner:profiles!opportunities_owner_id_fkey (id, first_name, last_name)
`;

export const getOpportunities = async (
  companyId: string,
  filters: OpportunityFilters = {},
  // Les affaires closes se comptent en centaines : sans plafond, la vue liste
  // téléchargerait tout l'historique commercial à chaque affichage.
  limit = 300
): Promise<OpportunityWithRelations[]> => {
  try {
    let query = db
      .from('opportunities')
      .select(SELECT_WITH_RELATIONS)
      .eq('company_id', companyId);

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    } else if (!filters.status) {
      // Par défaut le pipeline ne montre que les affaires en cours
      query = query.eq('status', 'open');
    }

    if (filters.ownerId) query = query.eq('owner_id', filters.ownerId);
    if (filters.stageIds?.length) query = query.in('stage_id', filters.stageIds);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.tags?.length) query = query.overlaps('tags', filters.tags);
    if (filters.overdueOnly) query = query.lte('next_action_at', new Date().toISOString());
    if (filters.search) {
      const term = `%${filters.search}%`;
      query = query.or(`name.ilike.${term},description.ilike.${term}`);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching opportunities:', error);
      return [];
    }
    return (data || []) as OpportunityWithRelations[];
  } catch (error) {
    console.error('❌ Exception fetching opportunities:', error);
    return [];
  }
};

export const getOpportunityById = async (
  id: string
): Promise<OpportunityWithRelations | null> => {
  try {
    const { data, error } = await db
      .from('opportunities')
      .select(SELECT_WITH_RELATIONS)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching opportunity:', error);
      return null;
    }
    return (data as OpportunityWithRelations) ?? null;
  } catch (error) {
    console.error('❌ Exception fetching opportunity:', error);
    return null;
  }
};

export interface CreateOpportunityInput {
  company_id: string;
  name: string;
  client_id?: string | null;
  primary_contact_id?: string | null;
  stage_id?: string | null;
  owner_id?: string | null;
  source?: string | null;
  created_from?: Opportunity['created_from'];
  estimated_monthly_payment?: number | null;
  estimated_amount?: number | null;
  expected_close_date?: string | null;
  next_action_at?: string | null;
  next_action_channel?: CrmChannel | null;
  next_action_note?: string | null;
  description?: string | null;
  tags?: string[];
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

export const createOpportunity = async (
  input: CreateOpportunityInput
): Promise<Opportunity | null> => {
  try {
    let stageId = input.stage_id;
    if (!stageId) {
      const stage = await getDefaultStage(input.company_id);
      stageId = stage?.id ?? null;
    }

    const { data, error } = await db
      .from('opportunities')
      .insert({ ...input, stage_id: stageId, created_from: input.created_from ?? 'manual' })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating opportunity:', error);
      return null;
    }
    return data as Opportunity;
  } catch (error) {
    console.error('❌ Exception creating opportunity:', error);
    return null;
  }
};

export const updateOpportunity = async (
  id: string,
  patch: Partial<Opportunity>
): Promise<boolean> => {
  try {
    const { error } = await db.from('opportunities').update(patch).eq('id', id);
    if (error) {
      console.error('❌ Error updating opportunity:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception updating opportunity:', error);
    return false;
  }
};

/**
 * Déplace une opportunité d'étape. Le statut (open/won/lost), les dates
 * won_at/lost_at et la trace dans la timeline sont gérés par les triggers SQL
 * — on n'écrit ici que stage_id.
 */
export const moveOpportunityToStage = async (
  id: string,
  stageId: string
): Promise<boolean> => updateOpportunity(id, { stage_id: stageId } as Partial<Opportunity>);

export const markOpportunityLost = async (
  id: string,
  lostStageId: string,
  reason: string,
  detail?: string
): Promise<boolean> =>
  updateOpportunity(id, {
    stage_id: lostStageId,
    lost_reason: reason,
    lost_reason_detail: detail ?? null,
  } as Partial<Opportunity>);

export const setNextAction = async (
  id: string,
  next: { at: string | null; channel: CrmChannel | null; note: string | null }
): Promise<boolean> =>
  updateOpportunity(id, {
    next_action_at: next.at,
    next_action_channel: next.channel,
    next_action_note: next.note,
  } as Partial<Opportunity>);

export const deleteOpportunity = async (id: string): Promise<boolean> => {
  try {
    const { error } = await db.from('opportunities').delete().eq('id', id);
    if (error) {
      console.error('❌ Error deleting opportunity:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception deleting opportunity:', error);
    return false;
  }
};

// ─── Agrégats pipeline ────────────────────────────────────────────────────────

export interface PipelineStageSummary {
  stage_id: string;
  key: string;
  label: string;
  color: string;
  probability: number;
  count: number;
  totalMonthly: number;
  weightedMonthly: number;
}

export interface PipelineSummary {
  stages: PipelineStageSummary[];
  totalCount: number;
  totalMonthly: number;
  weightedMonthly: number;
}

/**
 * Prévisionnel pondéré par la probabilité RÉELLE de chaque étape (colonne
 * pipeline_stages.probability), là où l'ancien dashboard utilisait des
 * probabilités codées en dur dans commercialDashboardService.ts.
 */
export const getPipelineSummary = async (
  companyId: string,
  ownerId?: string | null
): Promise<PipelineSummary> => {
  const empty: PipelineSummary = { stages: [], totalCount: 0, totalMonthly: 0, weightedMonthly: 0 };
  try {
    const [{ data: stages, error: stagesError }, opportunities] = await Promise.all([
      db
        .from('pipeline_stages')
        .select('id, key, label, color, probability, is_won, is_lost')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('position', { ascending: true }),
      getOpportunities(companyId, { status: 'open', ownerId }),
    ]);

    if (stagesError || !stages) {
      console.error('❌ Error fetching pipeline summary:', stagesError);
      return empty;
    }

    const byStage = new Map<string, OpportunityWithRelations[]>();
    opportunities.forEach((o) => {
      if (!o.stage_id) return;
      const list = byStage.get(o.stage_id) ?? [];
      list.push(o);
      byStage.set(o.stage_id, list);
    });

    const summary: PipelineStageSummary[] = (stages as any[])
      .filter((s) => !s.is_won && !s.is_lost)
      .map((s) => {
        const items = byStage.get(s.id) ?? [];
        const totalMonthly = items.reduce((sum, o) => sum + (o.estimated_monthly_payment ?? 0), 0);
        return {
          stage_id: s.id,
          key: s.key,
          label: s.label,
          color: s.color,
          probability: Number(s.probability) || 0,
          count: items.length,
          totalMonthly,
          weightedMonthly: (totalMonthly * (Number(s.probability) || 0)) / 100,
        };
      });

    return {
      stages: summary,
      totalCount: summary.reduce((n, s) => n + s.count, 0),
      totalMonthly: summary.reduce((n, s) => n + s.totalMonthly, 0),
      weightedMonthly: summary.reduce((n, s) => n + s.weightedMonthly, 0),
    };
  } catch (error) {
    console.error('❌ Exception building pipeline summary:', error);
    return empty;
  }
};

export interface OutcomeSummary {
  won: { count: number; monthly: number };
  lost: { count: number; monthly: number };
}

/**
 * Affaires closes. Elles ne sont pas rendues en colonnes de kanban — plusieurs
 * centaines de cartes gagnées noieraient les affaires en cours — mais résumées
 * en deux tuiles.
 */
export const getOutcomeSummary = async (
  companyId: string,
  ownerId?: string | null
): Promise<OutcomeSummary> => {
  const empty: OutcomeSummary = { won: { count: 0, monthly: 0 }, lost: { count: 0, monthly: 0 } };
  try {
    let query = db
      .from('opportunities')
      .select('status, estimated_monthly_payment')
      .eq('company_id', companyId)
      .in('status', ['won', 'lost']);

    if (ownerId) query = query.eq('owner_id', ownerId);

    const { data, error } = await query;
    if (error || !data) {
      console.error('❌ Error fetching outcome summary:', error);
      return empty;
    }

    return (data as any[]).reduce((acc, row) => {
      const bucket = row.status === 'won' ? acc.won : acc.lost;
      bucket.count += 1;
      bucket.monthly += row.estimated_monthly_payment ?? 0;
      return acc;
    }, structuredClone(empty));
  } catch (error) {
    console.error('❌ Exception fetching outcome summary:', error);
    return empty;
  }
};

/** Opportunités dont la prochaine action est échue ou prévue aujourd'hui. */
export const getDueActions = async (
  companyId: string,
  ownerId?: string | null,
  daysAhead = 0
): Promise<OpportunityWithRelations[]> => {
  try {
    const limit = new Date();
    limit.setDate(limit.getDate() + daysAhead);
    limit.setHours(23, 59, 59, 999);

    let query = db
      .from('opportunities')
      .select(SELECT_WITH_RELATIONS)
      .eq('company_id', companyId)
      .eq('status', 'open')
      .not('next_action_at', 'is', null)
      .lte('next_action_at', limit.toISOString());

    if (ownerId) query = query.eq('owner_id', ownerId);

    const { data, error } = await query.order('next_action_at', { ascending: true });
    if (error) {
      console.error('❌ Error fetching due actions:', error);
      return [];
    }
    return (data || []) as OpportunityWithRelations[];
  } catch (error) {
    console.error('❌ Exception fetching due actions:', error);
    return [];
  }
};
