import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useAuth } from '@/context/AuthContext';
import {
  getLeads,
  qualifyLead,
  rejectLead,
  importLeads,
  type LeadFilters,
  type ImportRow,
} from '@/services/crm/leadService';

export function useLeads(filters?: LeadFilters) {
  const { companyId } = useMultiTenant();
  return useQuery({
    queryKey: ['raw-leads', companyId, filters],
    queryFn: () => getLeads(companyId!, filters),
    enabled: !!companyId,
  });
}

export function useLeadMutations() {
  const queryClient = useQueryClient();
  const { companyId } = useMultiTenant();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['raw-leads'] });
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-summary'] });
  };

  const qualify = useMutation({
    mutationFn: async ({
      leadId,
      clientId,
      stageKey,
    }: {
      leadId: string;
      clientId?: string | null;
      stageKey?: string;
    }) => {
      const opportunityId = await qualifyLead(leadId, {
        clientId,
        ownerId: user?.id ?? null,
        stageKey,
      });
      if (!opportunityId) throw new Error('Qualification impossible');
      return opportunityId;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Lead qualifié — opportunité créée');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reject = useMutation({
    mutationFn: async ({ leadId, reason }: { leadId: string; reason: string }) => {
      const ok = await rejectLead(leadId, reason);
      if (!ok) throw new Error('Rejet impossible');
    },
    onSuccess: () => {
      invalidate();
      toast.success('Lead écarté');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importList = useMutation({
    mutationFn: async ({ rows, campaign }: { rows: ImportRow[]; campaign?: string }) => {
      if (!companyId) throw new Error('Société inconnue');
      return importLeads(companyId, rows, campaign);
    },
    onSuccess: (result) => {
      invalidate();
      if (result.errors.length > 0) {
        toast.error(`Import partiel : ${result.errors[0]}`);
      } else {
        toast.success(
          `${result.inserted} lead(s) importé(s)` +
            (result.skipped > 0 ? ` — ${result.skipped} ignoré(s) (doublon ou sans contact)` : '')
        );
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { qualify, reject, importList };
}
