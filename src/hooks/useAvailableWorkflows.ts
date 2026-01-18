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
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      const supabase = getSupabaseClient();
      
      // D'abord récupérer le company_id depuis le profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profile?.company_id) {
        console.error('Erreur récupération company_id:', profileError?.message);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('id, name, offer_type')
        .eq('company_id', profile.company_id)
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
  }, [user?.id]);

  return { workflows, loading };
};
