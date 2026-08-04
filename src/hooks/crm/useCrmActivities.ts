import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useAuth } from '@/context/AuthContext';
import {
  getActivities,
  getClientTimeline,
  getActivityStats,
  logActivity,
  deleteActivity,
  type LogActivityInput,
} from '@/services/crm/activityService';

export function useOpportunityActivities(opportunityId?: string) {
  return useQuery({
    queryKey: ['crm-activities', 'opportunity', opportunityId],
    queryFn: () => getActivities({ opportunityId: opportunityId! }),
    enabled: !!opportunityId,
  });
}

export function useClientTimeline(clientId?: string) {
  return useQuery({
    queryKey: ['crm-activities', 'client', clientId],
    queryFn: () => getClientTimeline(clientId!),
    enabled: !!clientId,
  });
}

export function useActivityStats(sinceDays = 30) {
  const { companyId } = useMultiTenant();
  return useQuery({
    queryKey: ['crm-activity-stats', companyId, sinceDays],
    queryFn: () => getActivityStats(companyId!, sinceDays),
    enabled: !!companyId,
  });
}

export function useActivityMutations() {
  const queryClient = useQueryClient();
  const { companyId } = useMultiTenant();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
  };

  const log = useMutation({
    mutationFn: async (input: Omit<LogActivityInput, 'company_id' | 'actor_id'>) => {
      if (!companyId) throw new Error('Société inconnue');
      const activity = await logActivity({
        ...input,
        company_id: companyId,
        actor_id: user?.id ?? null,
      });
      if (!activity) throw new Error("Enregistrement de l'activité impossible");
      return activity;
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const ok = await deleteActivity(id);
      if (!ok) throw new Error('Suppression impossible');
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  return { log, remove };
}
