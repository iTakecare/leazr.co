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
      .select(`
        *,
        profiles:created_by (
          first_name,
          last_name
        )
      `)
      .eq('offer_id', offerId)
      .order('called_at', { ascending: false });

    if (error) {
      console.error("❌ Error fetching call logs:", error);
      return [];
    }
    return (data || []) as CallLog[];
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
        id, offer_id, called_at, callback_date, notes, status,
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

    return active.map((item) => ({
      id: item.id,
      offer_id: item.offer_id,
      called_at: item.called_at,
      callback_date: item.callback_date,
      call_notes: item.notes,
      last_call_status: item.status,
      offers: item.offers,
      latest_offer_note: latestNoteMap[item.offer_id],
    }));
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
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('offer_call_logs')
      .select('offer_id, callback_date, status, called_at')
      .in('offer_id', offerIds)
      .in('status', ['voicemail', 'no_answer'])
      .not('callback_date', 'is', null)
      .order('called_at', { ascending: false });

    if (error) {
      console.error("❌ Error fetching offer callback statuses:", error);
      return {};
    }

    const result: Record<string, { callback_date: string; status: string } | null> = {};
    (data || []).forEach((row: any) => {
      if (!result[row.offer_id]) {
        result[row.offer_id] = {
          callback_date: row.callback_date,
          status: row.status,
        };
      }
    });
    return result;
  } catch (error) {
    console.error("❌ Exception fetching offer callback statuses:", error);
    return {};
  }
};
