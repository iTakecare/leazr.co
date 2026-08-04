import { db } from './crmClient';
import type { CrmActivity, CrmActivityDirection, CrmActivityType } from './types';

interface ActivityScope {
  opportunityId?: string;
  clientId?: string;
  contactId?: string;
  offerId?: string;
}

/**
 * Résout le nom des auteurs. La colonne actor_id pointe sur profiles, mais une
 * activité peut venir d'Alex ou d'un automate : dans ce cas actor_label porte
 * le libellé et actor_id est nul.
 */
const attachActorNames = async (activities: CrmActivity[]): Promise<CrmActivity[]> => {
  const ids = [...new Set(activities.map((a) => a.actor_id).filter(Boolean))] as string[];
  if (ids.length === 0) {
    return activities.map((a) => ({ ...a, actor_name: a.actor_label ?? 'Système' }));
  }

  const { data } = await db.from('profiles').select('id, first_name, last_name').in('id', ids);
  const names = new Map<string, string>();
  (data || []).forEach((p: any) => {
    names.set(p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Utilisateur');
  });

  return activities.map((a) => ({
    ...a,
    actor_name: a.actor_id ? names.get(a.actor_id) ?? 'Utilisateur' : a.actor_label ?? 'Système',
  }));
};

export const getActivities = async (
  scope: ActivityScope,
  limit = 100
): Promise<CrmActivity[]> => {
  try {
    let query = db.from('crm_activities').select('*');

    if (scope.opportunityId) query = query.eq('opportunity_id', scope.opportunityId);
    else if (scope.clientId) query = query.eq('client_id', scope.clientId);
    else if (scope.contactId) query = query.eq('contact_id', scope.contactId);
    else if (scope.offerId) query = query.eq('offer_id', scope.offerId);
    else return [];

    const { data, error } = await query
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching CRM activities:', error);
      return [];
    }
    return attachActorNames((data || []) as CrmActivity[]);
  } catch (error) {
    console.error('❌ Exception fetching CRM activities:', error);
    return [];
  }
};

/**
 * Timeline complète d'un compte : on remonte par le client pour capter aussi
 * les échanges rattachés à une AUTRE opportunité du même client.
 */
export const getClientTimeline = async (
  clientId: string,
  limit = 200
): Promise<CrmActivity[]> => getActivities({ clientId }, limit);

export interface LogActivityInput {
  company_id: string;
  opportunity_id?: string | null;
  client_id?: string | null;
  contact_id?: string | null;
  offer_id?: string | null;
  type: CrmActivityType;
  direction?: CrmActivityDirection;
  channel?: string | null;
  occurred_at?: string;
  actor_id?: string | null;
  subject?: string | null;
  body?: string | null;
  outcome?: string | null;
  payload?: Record<string, unknown>;
}

export const logActivity = async (input: LogActivityInput): Promise<CrmActivity | null> => {
  try {
    const { data, error } = await db
      .from('crm_activities')
      .insert({
        occurred_at: new Date().toISOString(),
        direction: 'internal',
        payload: {},
        ...input,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error logging CRM activity:', error);
      return null;
    }
    return data as CrmActivity;
  } catch (error) {
    console.error('❌ Exception logging CRM activity:', error);
    return null;
  }
};

export const deleteActivity = async (id: string): Promise<boolean> => {
  try {
    const { error } = await db.from('crm_activities').delete().eq('id', id);
    if (error) {
      console.error('❌ Error deleting CRM activity:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception deleting CRM activity:', error);
    return false;
  }
};

// ─── Statistiques d'activité (par commercial, par canal) ─────────────────────

export interface ActivityStats {
  byType: Record<string, number>;
  byOwner: { owner_id: string | null; name: string; count: number }[];
  total: number;
}

export const getActivityStats = async (
  companyId: string,
  sinceDays = 30
): Promise<ActivityStats> => {
  const empty: ActivityStats = { byType: {}, byOwner: [], total: 0 };
  try {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    const { data, error } = await db
      .from('crm_activities')
      .select('type, actor_id')
      .eq('company_id', companyId)
      .gte('occurred_at', since.toISOString());

    if (error || !data) {
      console.error('❌ Error fetching activity stats:', error);
      return empty;
    }

    const byType: Record<string, number> = {};
    const byOwnerCount = new Map<string | null, number>();
    (data as any[]).forEach((row) => {
      byType[row.type] = (byType[row.type] || 0) + 1;
      byOwnerCount.set(row.actor_id, (byOwnerCount.get(row.actor_id) || 0) + 1);
    });

    const ids = [...byOwnerCount.keys()].filter(Boolean) as string[];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', ids);
      (profiles || []).forEach((p: any) => {
        names.set(p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Utilisateur');
      });
    }

    const byOwner = [...byOwnerCount.entries()]
      .map(([owner_id, count]) => ({
        owner_id,
        name: owner_id ? names.get(owner_id) ?? 'Utilisateur' : 'Automatique / IA',
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      byType,
      byOwner,
      total: (data as any[]).length,
    };
  } catch (error) {
    console.error('❌ Exception fetching activity stats:', error);
    return empty;
  }
};
