/**
 * CRM Acquisition — types partagés.
 *
 * L'opportunité est le pivot du cycle de VENTE, à ne pas confondre avec
 * `offers.workflow_status` qui est le workflow de FINANCEMENT (docs → leaser →
 * accordé) et ne commence qu'une fois l'affaire gagnée.
 */

export type OpportunityStatus = 'open' | 'won' | 'lost';

export type CrmChannel =
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'sms'
  | 'meeting'
  | 'linkedin'
  | 'voice_ai'
  | 'other';

export type CrmActivityType =
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'sms'
  | 'meeting'
  | 'note'
  | 'task'
  | 'stage_change'
  | 'document'
  | 'voice_ai'
  | 'sequence'
  | 'system';

export type CrmActivityDirection = 'in' | 'out' | 'internal';

export type OpportunityOrigin =
  | 'manual'
  | 'meta'
  | 'website'
  | 'import'
  | 'offer_backfill'
  | 'api'
  | 'sequence';

export interface PipelineStage {
  id: string;
  company_id: string;
  key: string;
  label: string;
  position: number;
  probability: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
  is_default: boolean;
  active: boolean;
}

export interface Contact {
  id: string;
  company_id: string;
  client_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  company_name: string | null;
  vat_number: string | null;
  website: string | null;
  language: 'fr' | 'nl' | 'en' | 'de';
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  owner_id: string | null;
  tags: string[];
  notes: string | null;
  opt_out_email: boolean;
  opt_out_whatsapp: boolean;
  opt_out_sms: boolean;
  opt_out_at: string | null;
  opt_out_reason: string | null;
  last_activity_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  primary_contact_id: string | null;
  stage_id: string | null;
  status: OpportunityStatus;
  owner_id: string | null;

  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  created_from: OpportunityOrigin;

  estimated_monthly_payment: number | null;
  estimated_amount: number | null;
  currency: string;
  expected_close_date: string | null;

  next_action_at: string | null;
  next_action_channel: CrmChannel | null;
  next_action_note: string | null;

  last_activity_at: string | null;
  stage_changed_at: string;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  lost_reason_detail: string | null;
  intent_score: number | null;
  tags: string[];

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Opportunité enrichie des libellés utiles à l'affichage (jointures côté service). */
export interface OpportunityWithRelations extends Opportunity {
  stage?: Pick<PipelineStage, 'id' | 'key' | 'label' | 'color' | 'probability' | 'is_won' | 'is_lost'> | null;
  client?: { id: string; name: string; company: string | null; email: string | null } | null;
  contact?: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null;
  owner?: { id: string; first_name: string | null; last_name: string | null } | null;
  offers_count?: number;
}

export interface CrmActivity {
  id: string;
  company_id: string;
  opportunity_id: string | null;
  client_id: string | null;
  contact_id: string | null;
  offer_id: string | null;
  type: CrmActivityType;
  direction: CrmActivityDirection | null;
  channel: string | null;
  occurred_at: string;
  actor_id: string | null;
  actor_label: string | null;
  subject: string | null;
  body: string | null;
  outcome: string | null;
  payload: Record<string, unknown>;
  source_table: string | null;
  source_id: string | null;
  created_at: string;
  /** Résolu côté service — la FK pointe sur profiles mais l'auteur peut être l'IA. */
  actor_name?: string;
}

export interface OpportunityFilters {
  ownerId?: string | null;
  stageIds?: string[];
  status?: OpportunityStatus | 'all';
  source?: string;
  search?: string;
  /** true = uniquement celles dont next_action_at est échu */
  overdueOnly?: boolean;
  tags?: string[];
}

export const CHANNEL_LABELS: Record<CrmChannel, string> = {
  call: 'Appel',
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  meeting: 'Rendez-vous',
  linkedin: 'LinkedIn',
  voice_ai: 'Appel Alex (IA)',
  other: 'Autre',
};

export const ACTIVITY_LABELS: Record<CrmActivityType, string> = {
  call: 'Appel',
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  meeting: 'Rendez-vous',
  note: 'Note',
  task: 'Tâche',
  stage_change: "Changement d'étape",
  document: 'Document',
  voice_ai: 'Appel Alex',
  sequence: 'Séquence',
  system: 'Système',
};

/** Motifs de perte proposés à la clôture — alimentent le reporting Phase 6. */
export const LOST_REASONS = [
  { value: 'no_budget', label: 'Pas de budget' },
  { value: 'no_need', label: 'Pas de besoin' },
  { value: 'competitor', label: 'Parti chez un concurrent' },
  { value: 'financing_refused', label: 'Financement refusé' },
  { value: 'no_response', label: 'Jamais réussi à joindre' },
  { value: 'timing', label: 'Mauvais timing' },
  { value: 'price', label: 'Prix trop élevé' },
  { value: 'other', label: 'Autre' },
] as const;
