import { db } from './crmClient';
import type { PipelineStage } from './types';

export const getPipelineStages = async (companyId: string): Promise<PipelineStage[]> => {
  try {
    const { data, error } = await db
      .from('pipeline_stages')
      .select('*')
      .eq('company_id', companyId)
      .eq('active', true)
      .order('position', { ascending: true });

    if (error) {
      console.error('❌ Error fetching pipeline stages:', error);
      return [];
    }
    return (data || []) as PipelineStage[];
  } catch (error) {
    console.error('❌ Exception fetching pipeline stages:', error);
    return [];
  }
};

export const getDefaultStage = async (companyId: string): Promise<PipelineStage | null> => {
  const stages = await getPipelineStages(companyId);
  return stages.find((s) => s.is_default) ?? stages[0] ?? null;
};

export const updatePipelineStage = async (
  id: string,
  patch: Partial<Pick<PipelineStage, 'label' | 'position' | 'probability' | 'color' | 'active'>>
): Promise<boolean> => {
  try {
    const { error } = await db.from('pipeline_stages').update(patch).eq('id', id);
    if (error) {
      console.error('❌ Error updating pipeline stage:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception updating pipeline stage:', error);
    return false;
  }
};

export const createPipelineStage = async (
  companyId: string,
  stage: { key: string; label: string; position: number; probability?: number; color?: string }
): Promise<PipelineStage | null> => {
  try {
    const { data, error } = await db
      .from('pipeline_stages')
      .insert({ company_id: companyId, probability: 50, color: '#94a3b8', ...stage })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating pipeline stage:', error);
      return null;
    }
    return data as PipelineStage;
  } catch (error) {
    console.error('❌ Exception creating pipeline stage:', error);
    return null;
  }
};

/**
 * Réordonne les étapes en une passe. `orderedIds` doit contenir TOUTES les
 * étapes actives dans leur nouvel ordre.
 */
export const reorderPipelineStages = async (orderedIds: string[]): Promise<boolean> => {
  try {
    const updates = orderedIds.map((id, index) =>
      db.from('pipeline_stages').update({ position: index + 1 }).eq('id', id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r: any) => r.error);
    if (failed) {
      console.error('❌ Error reordering pipeline stages:', failed.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Exception reordering pipeline stages:', error);
    return false;
  }
};
