import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useAuth } from '@/context/AuthContext';
import {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  moveOpportunityToStage,
  markOpportunityLost,
  setNextAction,
  deleteOpportunity,
  getPipelineSummary,
  getDueActions,
  type CreateOpportunityInput,
} from '@/services/crm/opportunityService';
import { getPipelineStages } from '@/services/crm/pipelineService';
import type { Opportunity, OpportunityFilters, CrmChannel } from '@/services/crm/types';

const invalidateKeys = ['opportunities', 'pipeline-summary', 'due-actions', 'crm-activities'];

export function usePipelineStages() {
  const { companyId } = useMultiTenant();
  return useQuery({
    queryKey: ['pipeline-stages', companyId],
    queryFn: () => getPipelineStages(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // les étapes bougent rarement
  });
}

export function useOpportunities(filters?: OpportunityFilters) {
  const { companyId } = useMultiTenant();
  return useQuery({
    queryKey: ['opportunities', companyId, filters],
    queryFn: () => getOpportunities(companyId!, filters),
    enabled: !!companyId,
  });
}

export function useOpportunity(id?: string) {
  return useQuery({
    queryKey: ['opportunities', 'detail', id],
    queryFn: () => getOpportunityById(id!),
    enabled: !!id,
  });
}

export function usePipelineSummary(ownerId?: string | null) {
  const { companyId } = useMultiTenant();
  return useQuery({
    queryKey: ['pipeline-summary', companyId, ownerId],
    queryFn: () => getPipelineSummary(companyId!, ownerId),
    enabled: !!companyId,
  });
}

export function useDueActions(ownerId?: string | null, daysAhead = 0) {
  const { companyId } = useMultiTenant();
  return useQuery({
    queryKey: ['due-actions', companyId, ownerId, daysAhead],
    queryFn: () => getDueActions(companyId!, ownerId, daysAhead),
    enabled: !!companyId,
  });
}

export function useOpportunityMutations() {
  const queryClient = useQueryClient();
  const { companyId } = useMultiTenant();
  const { user } = useAuth();

  const invalidate = () =>
    invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

  const create = useMutation({
    mutationFn: async (input: Omit<CreateOpportunityInput, 'company_id'>) => {
      if (!companyId) throw new Error('Société inconnue');
      const opportunity = await createOpportunity({
        ...input,
        company_id: companyId,
        owner_id: input.owner_id ?? user?.id ?? null,
      });
      if (!opportunity) throw new Error("Création de l'opportunité impossible");
      return opportunity;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Opportunité créée');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Opportunity> }) => {
      const ok = await updateOpportunity(id, patch);
      if (!ok) throw new Error('Mise à jour impossible');
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  /**
   * Déplacement kanban : mise à jour optimiste pour que la carte ne « saute »
   * pas pendant l'aller-retour réseau.
   */
  const moveStage = useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const ok = await moveOpportunityToStage(id, stageId);
      if (!ok) throw new Error("Déplacement impossible");
    },
    onMutate: async ({ id, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ['opportunities'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['opportunities'] });
      snapshots.forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        queryClient.setQueryData(
          key,
          value.map((o: any) => (o.id === id ? { ...o, stage_id: stageId } : o))
        );
      });
      return { snapshots };
    },
    onError: (error: Error, _vars, context) => {
      context?.snapshots?.forEach(([key, value]: any) => queryClient.setQueryData(key, value));
      toast.error(error.message);
    },
    onSettled: () => invalidate(),
  });

  const markLost = useMutation({
    mutationFn: async ({
      id,
      lostStageId,
      reason,
      detail,
    }: {
      id: string;
      lostStageId: string;
      reason: string;
      detail?: string;
    }) => {
      const ok = await markOpportunityLost(id, lostStageId, reason, detail);
      if (!ok) throw new Error('Clôture impossible');
    },
    onSuccess: () => {
      invalidate();
      toast.success('Opportunité marquée perdue');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const planNextAction = useMutation({
    mutationFn: async ({
      id,
      at,
      channel,
      note,
    }: {
      id: string;
      at: string | null;
      channel: CrmChannel | null;
      note: string | null;
    }) => {
      const ok = await setNextAction(id, { at, channel, note });
      if (!ok) throw new Error('Planification impossible');
    },
    onSuccess: () => {
      invalidate();
      toast.success('Prochaine action planifiée');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const ok = await deleteOpportunity(id);
      if (!ok) throw new Error('Suppression impossible');
    },
    onSuccess: () => {
      invalidate();
      toast.success('Opportunité supprimée');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { create, update, moveStage, markLost, planNextAction, remove };
}
