import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfMonth, startOfWeek, endOfMonth, endOfWeek } from 'date-fns';

export interface ActivityItem {
  id: string;
  type: 'offer' | 'contract';
  action: string;
  entity_name: string;
  client_name: string;
  created_at: string;
  user_name?: string;
  status?: string;
  link: string;
}

export interface NoteItem {
  id: string;
  content: string;
  entity_type: 'offer' | 'contract';
  entity_id: string;
  entity_name: string;
  client_name: string;
  note_type: string;
  created_at: string;
  author_name?: string;
  link: string;
}

export interface PendingTask {
  id: string;
  type: 'docs_pending' | 'follow_up' | 'blocked';
  title: string;
  description: string;
  entity_id: string;
  entity_name: string;
  client_name: string;
  days_waiting: number;
  link: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CommercialStats {
  newOffersCount: number;
  newOffersChange: number;
  conversionRate: number;
  conversionRateChange: number;
  avgProcessingDays: number;
  avgProcessingDaysChange: number;
  pendingOffersCount: number;
}

/**
 * Récupère l'activité récente (demandes + contrats)
 */
export const getRecentActivity = async (companyId: string, limit: number = 15): Promise<ActivityItem[]> => {
  const activities: ActivityItem[] = [];

  // Récupérer les dernières demandes modifiées
  const { data: offers, error: offersError } = await supabase
    .from('offers')
    .select(`
      id,
      workflow_status,
      updated_at,
      created_at,
      clients!inner(name, company)
    `)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (!offersError && offers) {
    offers.forEach((offer: any) => {
      activities.push({
        id: offer.id,
        type: 'offer',
        action: getStatusAction(offer.workflow_status),
        entity_name: `Demande`,
        client_name: offer.clients?.company || offer.clients?.name || 'Client inconnu',
        created_at: offer.updated_at,
        status: offer.workflow_status,
        link: `/admin/offers?id=${offer.id}`
      });
    });
  }

  // Récupérer les derniers contrats modifiés
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select(`
      id,
      status,
      contract_number,
      updated_at,
      created_at,
      clients!inner(name, company)
    `)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (!contractsError && contracts) {
    contracts.forEach((contract: any) => {
      activities.push({
        id: contract.id,
        type: 'contract',
        action: getContractStatusAction(contract.status),
        entity_name: contract.contract_number || 'Contrat',
        client_name: contract.clients?.company || contract.clients?.name || 'Client inconnu',
        created_at: contract.updated_at,
        status: contract.status,
        link: `/admin/contracts?id=${contract.id}`
      });
    });
  }

  // Trier par date et limiter
  return activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
};

/**
 * Récupère les dernières notes
 */
export const getRecentNotes = async (companyId: string, limit: number = 10): Promise<NoteItem[]> => {
  const { data: offerNotes, error } = await supabase
    .from('offer_notes')
    .select(`
      id,
      content,
      note_type,
      created_at,
      offers!inner(
        id,
        company_id,
        clients!inner(name, company)
      )
    `)
    .eq('offers.company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notes:', error);
    return [];
  }

  return (offerNotes || []).map((note: any) => ({
    id: note.id,
    content: note.content?.substring(0, 100) + (note.content?.length > 100 ? '...' : ''),
    entity_type: 'offer',
    entity_id: note.offers?.id,
    entity_name: 'Demande',
    client_name: note.offers?.clients?.company || note.offers?.clients?.name || 'Client inconnu',
    note_type: note.note_type,
    created_at: note.created_at,
    link: `/admin/offers?id=${note.offers?.id}`
  }));
};

/**
 * Récupère les tâches en attente
 */
export const getPendingTasks = async (companyId: string): Promise<PendingTask[]> => {
  const tasks: PendingTask[] = [];
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const threeDaysAgo = subDays(now, 3);

  // Documents en attente
  const { data: pendingDocs } = await supabase
    .from('offers')
    .select(`
      id,
      workflow_status,
      updated_at,
      clients!inner(name, company)
    `)
    .eq('company_id', companyId)
    .eq('workflow_status', 'internal_docs_requested');

  if (pendingDocs) {
    pendingDocs.forEach((offer: any) => {
      const daysWaiting = Math.floor((now.getTime() - new Date(offer.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      tasks.push({
        id: `docs-${offer.id}`,
        type: 'docs_pending',
        title: 'Documents en attente',
        description: `En attente depuis ${daysWaiting} jour(s)`,
        entity_id: offer.id,
        entity_name: 'Demande',
        client_name: offer.clients?.company || offer.clients?.name || 'Client inconnu',
        days_waiting: daysWaiting,
        link: `/admin/offers?id=${offer.id}`,
        priority: daysWaiting > 5 ? 'high' : daysWaiting > 2 ? 'medium' : 'low'
      });
    });
  }

  // Dossiers à relancer (> 7 jours sans changement)
  const { data: staleOffers } = await supabase
    .from('offers')
    .select(`
      id,
      workflow_status,
      updated_at,
      clients!inner(name, company)
    `)
    .eq('company_id', companyId)
    .in('workflow_status', ['sent_to_client', 'info_requested'])
    .lt('updated_at', sevenDaysAgo.toISOString());

  if (staleOffers) {
    staleOffers.forEach((offer: any) => {
      const daysWaiting = Math.floor((now.getTime() - new Date(offer.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      tasks.push({
        id: `followup-${offer.id}`,
        type: 'follow_up',
        title: 'Relance nécessaire',
        description: `Sans réponse depuis ${daysWaiting} jour(s)`,
        entity_id: offer.id,
        entity_name: 'Demande',
        client_name: offer.clients?.company || offer.clients?.name || 'Client inconnu',
        days_waiting: daysWaiting,
        link: `/admin/offers?id=${offer.id}`,
        priority: daysWaiting > 14 ? 'high' : 'medium'
      });
    });
  }

  // Dossiers bloqués (scoring en attente > 3 jours)
  const { data: blockedOffers } = await supabase
    .from('offers')
    .select(`
      id,
      workflow_status,
      updated_at,
      clients!inner(name, company)
    `)
    .eq('company_id', companyId)
    .eq('workflow_status', 'leaser_pending')
    .lt('updated_at', threeDaysAgo.toISOString());

  if (blockedOffers) {
    blockedOffers.forEach((offer: any) => {
      const daysWaiting = Math.floor((now.getTime() - new Date(offer.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      tasks.push({
        id: `blocked-${offer.id}`,
        type: 'blocked',
        title: 'Scoring en attente',
        description: `Bloqué depuis ${daysWaiting} jour(s)`,
        entity_id: offer.id,
        entity_name: 'Demande',
        client_name: offer.clients?.company || offer.clients?.name || 'Client inconnu',
        days_waiting: daysWaiting,
        link: `/admin/offers?id=${offer.id}`,
        priority: 'high'
      });
    });
  }

  // Trier par priorité puis par jours d'attente
  return tasks.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.days_waiting - a.days_waiting;
  });
};

/**
 * Récupère les statistiques commerciales
 */
export const getCommercialStats = async (companyId: string, period: 'week' | 'month' = 'month'): Promise<CommercialStats> => {
  const now = new Date();
  
  const currentStart = period === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
  const currentEnd = period === 'week' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);
  
  const previousStart = period === 'week' 
    ? startOfWeek(subDays(currentStart, 7), { weekStartsOn: 1 }) 
    : startOfMonth(subDays(currentStart, 1));
  const previousEnd = period === 'week'
    ? endOfWeek(subDays(currentStart, 7), { weekStartsOn: 1 })
    : endOfMonth(subDays(currentStart, 1));

  // Nouvelles demandes période actuelle
  const { count: currentOffersCount } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', currentStart.toISOString())
    .lte('created_at', currentEnd.toISOString());

  // Nouvelles demandes période précédente
  const { count: previousOffersCount } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', previousStart.toISOString())
    .lte('created_at', previousEnd.toISOString());

  // Contrats signés période actuelle
  const { count: currentContractsCount } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', currentStart.toISOString())
    .lte('created_at', currentEnd.toISOString());

  // Contrats signés période précédente
  const { count: previousContractsCount } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', previousStart.toISOString())
    .lte('created_at', previousEnd.toISOString());

  // Demandes en attente
  const { count: pendingOffersCount } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .not('workflow_status', 'in', '(accepted,refused,cancelled)');

  // Calculs
  const currentConversionRate = currentOffersCount && currentOffersCount > 0 
    ? ((currentContractsCount || 0) / currentOffersCount) * 100 
    : 0;
  
  const previousConversionRate = previousOffersCount && previousOffersCount > 0 
    ? ((previousContractsCount || 0) / previousOffersCount) * 100 
    : 0;

  const offersChange = previousOffersCount && previousOffersCount > 0
    ? (((currentOffersCount || 0) - previousOffersCount) / previousOffersCount) * 100
    : 0;

  const conversionChange = previousConversionRate > 0
    ? currentConversionRate - previousConversionRate
    : 0;

  return {
    newOffersCount: currentOffersCount || 0,
    newOffersChange: Math.round(offersChange),
    conversionRate: Math.round(currentConversionRate),
    conversionRateChange: Math.round(conversionChange),
    avgProcessingDays: 5, // TODO: Calculer réellement
    avgProcessingDaysChange: 0,
    pendingOffersCount: pendingOffersCount || 0
  };
};

// Helpers
function getStatusAction(status: string): string {
  const actions: Record<string, string> = {
    'draft': 'Brouillon créé',
    'sent_to_client': 'Envoyé au client',
    'info_requested': 'Infos demandées',
    'client_validated': 'Validé par client',
    'internal_docs_requested': 'Docs internes demandés',
    'internal_docs_received': 'Docs internes reçus',
    'leaser_sent': 'Envoyé au bailleur',
    'leaser_pending': 'En attente bailleur',
    'leaser_approved': 'Approuvé par bailleur',
    'leaser_rejected': 'Refusé par bailleur',
    'accepted': 'Accepté',
    'refused': 'Refusé',
    'cancelled': 'Annulé'
  };
  return actions[status] || 'Mis à jour';
}

function getContractStatusAction(status: string): string {
  const actions: Record<string, string> = {
    'active': 'Activé',
    'pending': 'En attente',
    'completed': 'Terminé',
    'cancelled': 'Annulé'
  };
  return actions[status] || 'Mis à jour';
}
