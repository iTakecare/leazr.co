import { db } from './crmClient';

export type SequenceStatus = 'draft' | 'active' | 'paused';
export type SequenceTrigger = 'manual' | 'lead_created' | 'stage_entered' | 'tag_added';
export type StepChannel = 'email' | 'whatsapp' | 'sms' | 'call_task' | 'voice_ai';

export interface Sequence {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: SequenceStatus;
  trigger_type: SequenceTrigger;
  trigger_config: Record<string, string>;
  stop_on_reply: boolean;
  stop_on_stage_change: boolean;
  business_hours_only: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  steps?: SequenceStep[];
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  position: number;
  delay_minutes: number;
  channel: StepChannel;
  subject: string | null;
  body: string | null;
  template_key: string | null;
  assigned_to: string | null;
  active: boolean;
}

export interface EnrollmentStats {
  active: number;
  completed: number;
  stopped: number;
  failed: number;
}

export const CHANNEL_LABELS: Record<StepChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  call_task: 'Tâche d’appel',
  voice_ai: 'Appel Alex (IA)',
};

export const TRIGGER_LABELS: Record<SequenceTrigger, string> = {
  manual: 'Inscription manuelle',
  lead_created: 'À la création d’une affaire',
  stage_entered: 'À l’entrée dans une étape',
  tag_added: 'À l’ajout d’un tag',
};

/** Convertit un délai en minutes vers la paire (valeur, unité) de l'éditeur. */
export const splitDelay = (minutes: number): { value: number; unit: 'minutes' | 'hours' | 'days' } => {
  if (minutes === 0) return { value: 0, unit: 'minutes' };
  if (minutes % 1440 === 0) return { value: minutes / 1440, unit: 'days' };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: 'hours' };
  return { value: minutes, unit: 'minutes' };
};

export const toMinutes = (value: number, unit: 'minutes' | 'hours' | 'days'): number =>
  unit === 'days' ? value * 1440 : unit === 'hours' ? value * 60 : value;

export const formatDelay = (minutes: number): string => {
  if (minutes === 0) return 'immédiat';
  const { value, unit } = splitDelay(minutes);
  const labels = { minutes: 'min', hours: 'h', days: value > 1 ? 'jours' : 'jour' };
  return `+ ${value} ${labels[unit]}`;
};

export const getSequences = async (companyId: string): Promise<Sequence[]> => {
  try {
    const { data, error } = await db
      .from('sequences')
      .select('*, steps:sequence_steps(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching sequences:', error);
      return [];
    }
    return (data || []).map((s: any) => ({
      ...s,
      steps: (s.steps ?? []).sort((a: SequenceStep, b: SequenceStep) => a.position - b.position),
    })) as Sequence[];
  } catch (error) {
    console.error('❌ Exception fetching sequences:', error);
    return [];
  }
};

export const createSequence = async (
  input: Partial<Sequence> & { company_id: string; name: string }
): Promise<Sequence | null> => {
  try {
    const { data, error } = await db.from('sequences').insert(input).select().single();
    if (error) {
      console.error('❌ Error creating sequence:', error);
      return null;
    }
    return data as Sequence;
  } catch (error) {
    console.error('❌ Exception creating sequence:', error);
    return null;
  }
};

export const updateSequence = async (id: string, patch: Partial<Sequence>): Promise<boolean> => {
  try {
    const { steps, ...rest } = patch as any;
    const { error } = await db.from('sequences').update(rest).eq('id', id);
    if (error) {
      console.error('❌ Error updating sequence:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception updating sequence:', error);
    return false;
  }
};

export const deleteSequence = async (id: string): Promise<boolean> => {
  try {
    const { error } = await db.from('sequences').delete().eq('id', id);
    if (error) {
      console.error('❌ Error deleting sequence:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception deleting sequence:', error);
    return false;
  }
};

/**
 * Remplace les étapes d'une séquence. On supprime puis réinsère : les positions
 * portent une contrainte d'unicité, un réordonnancement partiel la violerait.
 */
export const replaceSteps = async (
  sequenceId: string,
  steps: Omit<SequenceStep, 'id' | 'sequence_id'>[]
): Promise<boolean> => {
  try {
    const { error: deleteError } = await db
      .from('sequence_steps')
      .delete()
      .eq('sequence_id', sequenceId);
    if (deleteError) {
      console.error('❌ Error clearing steps:', deleteError);
      return false;
    }

    if (steps.length === 0) return true;

    const { error } = await db.from('sequence_steps').insert(
      steps.map((step, index) => ({ ...step, sequence_id: sequenceId, position: index + 1 }))
    );
    if (error) {
      console.error('❌ Error inserting steps:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception replacing steps:', error);
    return false;
  }
};

export const getEnrollmentStats = async (
  companyId: string
): Promise<Record<string, EnrollmentStats>> => {
  try {
    const { data, error } = await db
      .from('sequence_enrollments')
      .select('sequence_id, status')
      .eq('company_id', companyId);

    if (error || !data) return {};

    const stats: Record<string, EnrollmentStats> = {};
    (data as any[]).forEach((row) => {
      stats[row.sequence_id] ??= { active: 0, completed: 0, stopped: 0, failed: 0 };
      const bucket = stats[row.sequence_id];
      if (row.status in bucket) (bucket as any)[row.status] += 1;
    });
    return stats;
  } catch (error) {
    console.error('❌ Exception fetching enrollment stats:', error);
    return {};
  }
};

/** Inscrit une affaire dans une séquence. Retourne l'id d'inscription. */
export const enrollOpportunity = async (
  sequenceId: string,
  opportunityId: string
): Promise<string | null> => {
  try {
    const { data, error } = await db.rpc('crm_enroll_in_sequence', {
      p_sequence_id: sequenceId,
      p_opportunity_id: opportunityId,
      p_contact_id: null,
      p_enrolled_by: null,
    });
    if (error) {
      console.error('❌ Error enrolling opportunity:', error);
      return null;
    }
    return data as string;
  } catch (error) {
    console.error('❌ Exception enrolling opportunity:', error);
    return null;
  }
};

export const getEnrollmentsForOpportunity = async (opportunityId: string) => {
  try {
    const { data, error } = await db
      .from('sequence_enrollments')
      .select('id, status, current_step, next_run_at, stopped_reason, sequence:sequences(id, name)')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
};
