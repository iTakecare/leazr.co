import { db } from './crmClient';

export type LeadStatus = 'new' | 'qualified' | 'rejected' | 'duplicate';

export interface RawLead {
  id: string;
  company_id: string;
  source: string;
  external_id: string | null;
  status: LeadStatus;
  payload: Record<string, unknown>;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  vat_number: string | null;
  message: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  assigned_to: string | null;
  qualified_at: string | null;
  opportunity_id: string | null;
  contact_id: string | null;
  client_id: string | null;
  rejection_reason: string | null;
  received_at: string;
  created_at: string;
}

export interface LeadFilters {
  status?: LeadStatus | 'all';
  source?: string;
  search?: string;
}

export const getLeads = async (
  companyId: string,
  filters: LeadFilters = {},
  limit = 200
): Promise<RawLead[]> => {
  try {
    let query = db.from('raw_leads').select('*').eq('company_id', companyId);

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},company_name.ilike.${term}`
      );
    }

    const { data, error } = await query
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching leads:', error);
      return [];
    }
    return (data || []) as RawLead[];
  } catch (error) {
    console.error('❌ Exception fetching leads:', error);
    return [];
  }
};

/**
 * Qualification : contact + opportunité créés côté base, en une transaction.
 * Retourne l'id de l'opportunité.
 */
export const qualifyLead = async (
  leadId: string,
  options: { clientId?: string | null; ownerId?: string | null; stageKey?: string } = {}
): Promise<string | null> => {
  try {
    const { data, error } = await db.rpc('crm_qualify_lead', {
      p_lead_id: leadId,
      p_client_id: options.clientId ?? null,
      p_owner_id: options.ownerId ?? null,
      p_stage_key: options.stageKey ?? 'contacted',
    });

    if (error) {
      console.error('❌ Error qualifying lead:', error);
      return null;
    }
    return data as string;
  } catch (error) {
    console.error('❌ Exception qualifying lead:', error);
    return null;
  }
};

export const rejectLead = async (leadId: string, reason: string): Promise<boolean> => {
  try {
    const { error } = await db
      .from('raw_leads')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', leadId);
    if (error) {
      console.error('❌ Error rejecting lead:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception rejecting lead:', error);
    return false;
  }
};

export interface ImportRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  vat_number?: string;
  message?: string;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

/**
 * Import d'une liste de prospection. `external_id` est dérivé de l'email : le
 * même fichier réimporté deux fois n'engendre pas de doublons (index unique
 * partiel sur company_id + source + external_id).
 */
export const importLeads = async (
  companyId: string,
  rows: ImportRow[],
  campaign?: string
): Promise<ImportResult> => {
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };

  const payloads = rows
    .filter((row) => {
      const hasIdentity = row.email?.trim() || row.phone?.trim() || row.company_name?.trim();
      if (!hasIdentity) result.skipped += 1;
      return hasIdentity;
    })
    .map((row) => ({
      company_id: companyId,
      source: 'csv_import',
      external_id: row.email?.trim().toLowerCase() || null,
      first_name: row.first_name?.trim() || null,
      last_name: row.last_name?.trim() || null,
      email: row.email?.trim().toLowerCase() || null,
      phone: row.phone?.trim() || null,
      company_name: row.company_name?.trim() || null,
      vat_number: row.vat_number?.trim() || null,
      message: row.message?.trim() || null,
      utm_source: 'import',
      utm_campaign: campaign || null,
      payload: row as Record<string, unknown>,
    }));

  // Par paquets : un import de plusieurs milliers de lignes en une requête
  // dépasse les limites de PostgREST.
  const CHUNK = 500;
  for (let i = 0; i < payloads.length; i += CHUNK) {
    const chunk = payloads.slice(i, i + CHUNK);
    const { data, error } = await db
      .from('raw_leads')
      .upsert(chunk, {
        onConflict: 'company_id,source,external_id',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      console.error('❌ Error importing leads:', error);
      result.errors.push(error.message);
    } else {
      result.inserted += (data ?? []).length;
      result.skipped += chunk.length - (data ?? []).length;
    }
  }

  return result;
};

/**
 * Analyse un CSV en devinant les colonnes. Les en-têtes acceptés couvrent les
 * exports courants (LinkedIn, Apollo, Excel français).
 */
export const parseLeadCsv = (text: string): ImportRow[] => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const separator = (lines[0].match(/;/g) ?? []).length > (lines[0].match(/,/g) ?? []).length ? ';' : ',';

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        cells.push(current);
        current = '';
      } else current += char;
    }
    cells.push(current);
    return cells.map((c) => c.trim());
  };

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const ALIASES: Record<keyof ImportRow, string[]> = {
    first_name: ['firstname', 'prenom', 'prenoms', 'given', 'givenname'],
    last_name: ['lastname', 'nom', 'surname', 'familyname', 'namefamily'],
    email: ['email', 'mail', 'courriel', 'emailaddress', 'adresseemail'],
    phone: ['phone', 'telephone', 'tel', 'gsm', 'mobile', 'phonenumber', 'numero'],
    company_name: ['company', 'societe', 'entreprise', 'companyname', 'organisation', 'organization', 'raisonsociale'],
    vat_number: ['vat', 'tva', 'vatnumber', 'numerotva', 'bce', 'siren', 'siret'],
    message: ['message', 'note', 'notes', 'commentaire', 'remarque', 'besoin'],
  };

  const headers = splitLine(lines[0]).map(normalize);
  const indexOf = (field: keyof ImportRow) =>
    headers.findIndex((h) => ALIASES[field].some((alias) => h === alias || h.includes(alias)));

  const map = Object.fromEntries(
    (Object.keys(ALIASES) as (keyof ImportRow)[]).map((field) => [field, indexOf(field)])
  ) as Record<keyof ImportRow, number>;

  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: ImportRow = {};
    (Object.keys(map) as (keyof ImportRow)[]).forEach((field) => {
      const index = map[field];
      if (index >= 0 && cells[index]) row[field] = cells[index];
    });
    // Un fichier avec « Nom complet » et pas de colonne prénom
    if (!row.first_name && row.last_name?.includes(' ')) {
      const [first, ...rest] = row.last_name.split(' ');
      row.first_name = first;
      row.last_name = rest.join(' ');
    }
    return row;
  });
};
