import { db } from './crmClient';
import type { Contact } from './types';

export interface ContactFilters {
  search?: string;
  clientId?: string | null;
  ownerId?: string | null;
  tags?: string[];
  /** Exclut les contacts désinscrits sur le canal visé (prospection). */
  reachableOn?: 'email' | 'whatsapp' | 'sms';
}

export const getContacts = async (
  companyId: string,
  filters: ContactFilters = {},
  limit = 200
): Promise<Contact[]> => {
  try {
    let query = db.from('contacts').select('*').eq('company_id', companyId);

    if (filters.clientId) query = query.eq('client_id', filters.clientId);
    if (filters.ownerId) query = query.eq('owner_id', filters.ownerId);
    if (filters.tags?.length) query = query.overlaps('tags', filters.tags);
    if (filters.reachableOn) query = query.eq(`opt_out_${filters.reachableOn}`, false);
    if (filters.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},company_name.ilike.${term}`
      );
    }

    const { data, error } = await query
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching contacts:', error);
      return [];
    }
    return (data || []) as Contact[];
  } catch (error) {
    console.error('❌ Exception fetching contacts:', error);
    return [];
  }
};

export const getContactById = async (id: string): Promise<Contact | null> => {
  try {
    const { data, error } = await db.from('contacts').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error('❌ Error fetching contact:', error);
      return null;
    }
    return (data as Contact) ?? null;
  } catch (error) {
    console.error('❌ Exception fetching contact:', error);
    return null;
  }
};

export const createContact = async (
  input: Partial<Contact> & { company_id: string }
): Promise<Contact | null> => {
  try {
    const payload = { ...input };
    if (payload.email) payload.email = payload.email.trim().toLowerCase();

    const { data, error } = await db.from('contacts').insert(payload).select().single();
    if (error) {
      console.error('❌ Error creating contact:', error);
      return null;
    }
    return data as Contact;
  } catch (error) {
    console.error('❌ Exception creating contact:', error);
    return null;
  }
};

export const updateContact = async (id: string, patch: Partial<Contact>): Promise<boolean> => {
  try {
    const payload = { ...patch };
    if (payload.email) payload.email = payload.email.trim().toLowerCase();

    const { error } = await db.from('contacts').update(payload).eq('id', id);
    if (error) {
      console.error('❌ Error updating contact:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception updating contact:', error);
    return false;
  }
};

export const deleteContact = async (id: string): Promise<boolean> => {
  try {
    const { error } = await db.from('contacts').delete().eq('id', id);
    if (error) {
      console.error('❌ Error deleting contact:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception deleting contact:', error);
    return false;
  }
};

/**
 * Désinscription. On coupe le canal visé (ou tous), et on horodate : le
 * dispatcher de séquences (Phase 4) refuse tout envoi sur un canal désinscrit.
 */
export const optOutContact = async (
  id: string,
  channels: ('email' | 'whatsapp' | 'sms')[] | 'all',
  reason?: string
): Promise<boolean> => {
  const list = channels === 'all' ? (['email', 'whatsapp', 'sms'] as const) : channels;
  const patch: Record<string, unknown> = {
    opt_out_at: new Date().toISOString(),
    opt_out_reason: reason ?? null,
  };
  list.forEach((c) => {
    patch[`opt_out_${c}`] = true;
  });
  return updateContact(id, patch as Partial<Contact>);
};

/** Retrouve ou crée un contact à partir d'un email — utilisé par les imports. */
export const upsertContactByEmail = async (
  companyId: string,
  email: string,
  defaults: Partial<Contact> = {}
): Promise<Contact | null> => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const { data: existing } = await db
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .eq('email', normalized)
      .maybeSingle();

    if (existing) {
      // On n'écrase jamais une valeur déjà renseignée
      const patch: Record<string, unknown> = {};
      Object.entries(defaults).forEach(([key, value]) => {
        if (value != null && value !== '' && (existing as any)[key] == null) patch[key] = value;
      });
      if (Object.keys(patch).length > 0) await updateContact((existing as Contact).id, patch);
      return existing as Contact;
    }

    return createContact({ ...defaults, company_id: companyId, email: normalized });
  } catch (error) {
    console.error('❌ Exception upserting contact:', error);
    return null;
  }
};
