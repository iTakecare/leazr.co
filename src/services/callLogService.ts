import { supabase } from "@/integrations/supabase/client";

export interface CallLog {
  id: string;
  offer_id: string;
  company_id: string;
  called_at: string;
  status: 'voicemail' | 'no_answer' | 'reached';
  callback_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export interface PendingCallback {
  id: string;
  offer_id: string;
  called_at: string;
  callback_date: string;
  notes: string | null;
  offers: {
    dossier_number: string;
    client_name: string;
    workflow_status: string;
  };
}

export const getCallLogs = async (offerId: string): Promise<CallLog[]> => {
  try {
    const { data, error } = await supabase
      .from('offer_call_logs')
      .select('*')
      .eq('offer_id', offerId)
      .order('called_at', { ascending: false });

    if (error) {
      console.error("❌ Error fetching call logs:", error);
      return [];
    }
    const logs = (data || []) as CallLog[];

    // Fetch author profiles separately (FK is to auth.users, not profiles — can't use PostgREST join)
    const createdByIds = [...new Set(logs.map(l => l.created_by).filter(Boolean))];
    if (createdByIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', createdByIds);
      const profileMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
      (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });
      logs.forEach(log => {
        if (log.created_by && profileMap[log.created_by]) {
          log.profiles = profileMap[log.created_by];
        }
      });
    }

    return logs;
  } catch (error) {
    console.error("❌ Exception fetching call logs:", error);
    return [];
  }
};

export const createCallLog = async (data: {
  offer_id: string;
  company_id: string;
  status: 'voicemail' | 'no_answer' | 'reached';
  callback_date?: string | null;
  notes?: string;
}): Promise<CallLog | null> => {
  try {
    const { data: result, error } = await supabase
      .from('offer_call_logs')
      .insert({
        ...data,
        called_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating call log:", error);
      return null;
    }
    return result;
  } catch (error) {
    console.error("❌ Exception creating call log:", error);
    return null;
  }
};

export const deleteCallLog = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offer_call_logs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("❌ Error deleting call log:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ Exception deleting call log:", error);
    return false;
  }
};

export const getPendingCallbacks = async (companyId: string): Promise<PendingCallback[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('offer_call_logs')
      .select(`
        id,
        offer_id,
        called_at,
        callback_date,
        notes,
        offers (
          dossier_number,
          client_name,
          workflow_status
        )
      `)
      .eq('company_id', companyId)
      .in('status', ['voicemail', 'no_answer'])
      .not('callback_date', 'is', null)
      .lte('callback_date', today)
      .order('callback_date', { ascending: true });

    if (error) {
      console.error("❌ Error fetching pending callbacks:", error);
      return [];
    }

    // Keep only the most recent call log per offer
    const seen = new Set<string>();
    return (data || []).filter((item: any) => {
      if (seen.has(item.offer_id)) return false;
      seen.add(item.offer_id);
      return true;
    }) as PendingCallback[];
  } catch (error) {
    console.error("❌ Exception fetching pending callbacks:", error);
    return [];
  }
};

export const getUpcomingCallbacks = async (
  companyId: string,
  daysAhead = 7
): Promise<PendingCallback[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    const futureDate = future.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('offer_call_logs')
      .select(`
        id,
        offer_id,
        called_at,
        callback_date,
        notes,
        offers (
          dossier_number,
          client_name,
          workflow_status
        )
      `)
      .eq('company_id', companyId)
      .in('status', ['voicemail', 'no_answer'])
      .not('callback_date', 'is', null)
      .gt('callback_date', today)
      .lte('callback_date', futureDate)
      .order('callback_date', { ascending: true });

    if (error) {
      console.error("❌ Error fetching upcoming callbacks:", error);
      return [];
    }

    const seen = new Set<string>();
    return (data || []).filter((item: any) => {
      if (seen.has(item.offer_id)) return false;
      seen.add(item.offer_id);
      return true;
    }) as PendingCallback[];
  } catch (error) {
    console.error("❌ Exception fetching upcoming callbacks:", error);
    return [];
  }
};

export interface DashboardCallback {
  id: string;
  offer_id: string;
  called_at: string;
  callback_date: string;
  call_notes: string | null;
  last_call_status: 'voicemail' | 'no_answer';
  author_name: string;
  offers: {
    dossier_number: string;
    client_name: string;
    workflow_status: string;
  };
  latest_offer_note?: {
    content: string;
    created_at: string;
  };
}

export const getDashboardCallbacks = async (
  companyId: string,
  daysAhead = 7
): Promise<DashboardCallback[]> => {
  try {
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    const futureDate = future.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('offer_call_logs')
      .select(`
        id, offer_id, called_at, callback_date, notes, status, created_by,
        offers (dossier_number, client_name, workflow_status)
      `)
      .eq('company_id', companyId)
      .in('status', ['voicemail', 'no_answer'])
      .not('callback_date', 'is', null)
      .lte('callback_date', futureDate)
      .order('called_at', { ascending: false }); // plus récent en premier

    if (error || !data) {
      console.error("❌ Error fetching dashboard callbacks:", error);
      return [];
    }

    // Fetch author profiles separately (FK points to auth.users, not profiles — can't use PostgREST join)
    const createdByIds = [...new Set((data as any[]).map(d => d.created_by).filter(Boolean))];
    const profileMap: Record<string, { first_name?: string; last_name?: string }> = {};
    if (createdByIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', createdByIds);
      (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });
    }

    // Deduplicate — keep most recent call log per offer (already sorted by called_at DESC)
    const seen = new Set<string>();
    const deduped = (data as any[]).filter((item) => {
      if (seen.has(item.offer_id)) return false;
      seen.add(item.offer_id);
      return true;
    });

    // Exclure les offres terminées (contrat signé, finalisé, accepté...)
    const DONE_STATUSES = new Set([
      'accepted', 'leaser_approved', 'validated', 'financed',
      'signed', 'completed', 'contract_sent',
      'without_follow_up', 'internal_rejected', 'leaser_rejected', 'rejected'
    ]);
    const active = deduped.filter(
      (item) => !DONE_STATUSES.has(item.offers?.workflow_status?.toLowerCase?.())
    );

    // Re-sort by callback_date ascending (overdue first) after dedup
    active.sort((a, b) => {
      const da = new Date(a.callback_date).getTime();
      const db = new Date(b.callback_date).getTime();
      return da - db;
    });

    if (active.length === 0) return [];

    const offerIds = active.map((d) => d.offer_id);

    // Fetch latest note per offer
    const { data: notesData } = await supabase
      .from('offer_notes')
      .select('offer_id, content, created_at')
      .in('offer_id', offerIds)
      .order('created_at', { ascending: false });

    const latestNoteMap: Record<string, { content: string; created_at: string }> = {};
    (notesData || []).forEach((n: any) => {
      if (!latestNoteMap[n.offer_id]) {
        latestNoteMap[n.offer_id] = { content: n.content, created_at: n.created_at };
      }
    });

    return active.map((item) => {
      const p = profileMap[item.created_by] ?? null;
      const first = p?.first_name ?? '';
      const last  = p?.last_name  ?? '';
      const fullName = `${first} ${last}`.trim() || 'Inconnu';
      return {
        id: item.id,
        offer_id: item.offer_id,
        called_at: item.called_at,
        callback_date: item.callback_date,
        call_notes: item.notes,
        last_call_status: item.status,
        author_name: fullName,
        offers: item.offers,
        latest_offer_note: latestNoteMap[item.offer_id],
      };
    });
  } catch (error) {
    console.error("❌ Exception fetching dashboard callbacks:", error);
    return [];
  }
};

export const getOfferCallbackStatus = async (
  offerIds: string[]
): Promise<Record<string, { callback_date: string; status: string } | null>> => {
  if (offerIds.length === 0) return {};
  try {
    // 1. Récupérer TOUS les appels (peu importe le statut) pour ne garder que le dernier
    //    par offre : un rappel n'est "en attente" que si le DERNIER appel est un
    //    voicemail/no_answer avec une date de rappel. Si on a depuis rappelé et joint
    //    le client ('reached'), le dernier appel n'est plus en attente → plus de logo.
    const { data, error } = await supabase
      .from('offer_call_logs')
      .select('offer_id, callback_date, status, called_at')
      .in('offer_id', offerIds)
      .order('called_at', { ascending: false });

    if (error) {
      console.error("❌ Error fetching offer callback statuses:", error);
      return {};
    }

    // Dernier appel par offre (data déjà triée par called_at desc)
    const latestCallByOffer = new Map<string, { callback_date: string | null; status: string; called_at: string }>();
    (data || []).forEach((row: any) => {
      if (!latestCallByOffer.has(row.offer_id)) {
        latestCallByOffer.set(row.offer_id, row);
      }
    });

    // Offres avec un rappel potentiellement en attente
    const pending = [...latestCallByOffer.entries()].filter(
      ([, call]) => ['voicemail', 'no_answer'].includes(call.status) && call.callback_date
    );

    if (pending.length === 0) return {};

    // 2. Récupérer l'activité du dossier postérieure à l'appel : si on a modifié l'offre
    //    (offers.updated_at) ou changé son statut / envoyé au leaseur (offer_workflow_logs)
    //    APRÈS l'appel, le rappel est considéré comme traité → on retire le logo.
    const pendingIds = pending.map(([id]) => id);

    const [{ data: offersData }, { data: workflowLogs }] = await Promise.all([
      supabase.from('offers').select('id, updated_at').in('id', pendingIds),
      supabase
        .from('offer_workflow_logs')
        .select('offer_id, created_at')
        .in('offer_id', pendingIds)
        .order('created_at', { ascending: false }),
    ]);

    const updatedAtByOffer = new Map<string, string>();
    (offersData || []).forEach((o: any) => updatedAtByOffer.set(o.id, o.updated_at));

    const latestLogByOffer = new Map<string, string>();
    (workflowLogs || []).forEach((log: any) => {
      if (!latestLogByOffer.has(log.offer_id)) {
        latestLogByOffer.set(log.offer_id, log.created_at);
      }
    });

    const result: Record<string, { callback_date: string; status: string } | null> = {};
    pending.forEach(([offerId, call]) => {
      const calledAtTime = new Date(call.called_at).getTime();
      const updatedAtTime = updatedAtByOffer.has(offerId)
        ? new Date(updatedAtByOffer.get(offerId)!).getTime()
        : 0;
      const lastLogTime = latestLogByOffer.has(offerId)
        ? new Date(latestLogByOffer.get(offerId)!).getTime()
        : 0;
      const lastActionTime = Math.max(updatedAtTime, lastLogTime);

      // Action sur le dossier postérieure à l'appel → rappel traité
      if (lastActionTime > calledAtTime) return;

      result[offerId] = {
        callback_date: call.callback_date!,
        status: call.status,
      };
    });

    return result;
  } catch (error) {
    console.error("❌ Exception fetching offer callback statuses:", error);
    return {};
  }
};
