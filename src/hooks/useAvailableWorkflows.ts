import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface WorkflowOption {
  value: string;
  label: string;
  offer_type: string;
}

export const useAvailableWorkflows = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      const companyId = user?.company;
      if (!companyId) {
        setLoading(false);
        return;
      }
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('id, name, offer_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('is_for_contracts', false)
        .order('name');

      if (!error && data) {
        // Dédupliquer par offer_type pour éviter les doublons
        const uniqueByOfferType = data.reduce((acc, w) => {
          if (!acc.find(item => item.offer_type === w.offer_type)) {
            acc.push({
              value: w.offer_type,
              label: w.name,
              offer_type: w.offer_type
            });
          }
          return acc;
        }, [] as WorkflowOption[]);
        
        setWorkflows(uniqueByOfferType);
      }
      setLoading(false);
    };

    fetchWorkflows();
  }, [user?.company]);

  return { workflows, loading };
};
