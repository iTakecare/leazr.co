import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useAuth } from '@/context/AuthContext';
import {
  getSequences,
  createSequence,
  updateSequence,
  deleteSequence,
  replaceSteps,
  getEnrollmentStats,
  enrollOpportunity,
  getEnrollmentsForOpportunity,
  type Sequence,
  type SequenceStep,
} from '@/services/crm/sequenceService';

export function useSequences() {
  const { companyId } = useMultiTenant();
  return useQuery({
    queryKey: ['sequences', companyId],
    queryFn: () => getSequences(companyId!),
    enabled: !!companyId,
  });
}

export function useEnrollmentStats() {
  const { companyId } = useMultiTenant();
  return useQuery({
    queryKey: ['sequence-enrollment-stats', companyId],
    queryFn: () => getEnrollmentStats(companyId!),
    enabled: !!companyId,
  });
}

export function useOpportunityEnrollments(opportunityId?: string) {
  return useQuery({
    queryKey: ['sequence-enrollments', 'opportunity', opportunityId],
    queryFn: () => getEnrollmentsForOpportunity(opportunityId!),
    enabled: !!opportunityId,
  });
}

export function useSequenceMutations() {
  const queryClient = useQueryClient();
  const { companyId } = useMultiTenant();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sequences'] });
    queryClient.invalidateQueries({ queryKey: ['sequence-enrollment-stats'] });
    queryClient.invalidateQueries({ queryKey: ['sequence-enrollments'] });
  };

  const save = useMutation({
    mutationFn: async ({
      sequence,
      steps,
    }: {
      sequence: Partial<Sequence> & { id?: string; name: string };
      steps: Omit<SequenceStep, 'id' | 'sequence_id'>[];
    }) => {
      if (!companyId) throw new Error('Société inconnue');

      let sequenceId = sequence.id;
      if (sequenceId) {
        const ok = await updateSequence(sequenceId, sequence);
        if (!ok) throw new Error('Enregistrement impossible');
      } else {
        const created = await createSequence({
          ...sequence,
          company_id: companyId,
          created_by: user?.id ?? null,
        });
        if (!created) throw new Error('Création impossible');
        sequenceId = created.id;
      }

      const stepsOk = await replaceSteps(sequenceId!, steps);
      if (!stepsOk) throw new Error('Enregistrement des étapes impossible');
      return sequenceId!;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Séquence enregistrée');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Sequence['status'] }) => {
      const ok = await updateSequence(id, { status });
      if (!ok) throw new Error('Changement de statut impossible');
      return status;
    },
    onSuccess: (status) => {
      invalidate();
      toast.success(
        status === 'active'
          ? 'Séquence activée — les envois démarrent au prochain passage (5 min)'
          : status === 'paused'
            ? 'Séquence mise en pause'
            : 'Séquence repassée en brouillon'
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const ok = await deleteSequence(id);
      if (!ok) throw new Error('Suppression impossible');
    },
    onSuccess: () => {
      invalidate();
      toast.success('Séquence supprimée');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const enroll = useMutation({
    mutationFn: async ({
      sequenceId,
      opportunityId,
    }: {
      sequenceId: string;
      opportunityId: string;
    }) => {
      const enrollmentId = await enrollOpportunity(sequenceId, opportunityId);
      if (!enrollmentId) {
        throw new Error(
          'Inscription impossible — la séquence est-elle active et pourvue d’au moins une étape ?'
        );
      }
      return enrollmentId;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Affaire inscrite dans la séquence');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { save, setStatus, remove, enroll };
}
