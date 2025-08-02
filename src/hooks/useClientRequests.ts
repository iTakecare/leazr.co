import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientData } from './useClientData';

export const useClientRequests = () => {
  const { clientData } = useClientData();

  return useQuery({
    queryKey: ['client-requests', clientData?.id],
    queryFn: async () => {
      if (!clientData?.id) {
        throw new Error('Client ID not found');
      }

      const { data, error } = await supabase
        .from('offers')
        .select('id, status, workflow_status, type, created_at')
        .eq('client_id', clientData.id)
        .eq('type', 'client_request')
        .in('status', ['pending', 'draft', 'sent'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching client requests:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!clientData?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useClientRequestsCount = () => {
  const { data: requests = [], isLoading } = useClientRequests();
  
  return {
    count: requests.length,
    isLoading
  };
};