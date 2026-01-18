import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface WorkflowOption {
  value: string;
  label: string;
  offer_type: string;
}

export const useAvailableWorkflows = (filterOfferType?: string) => {
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
      
      let query = supabase
        .from('workflow_templates')
        .select('id, name, offer_type')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .eq('is_for_contracts', false);
      
      // Si un filtre est spécifié, ne récupérer que les workflows de ce type
      if (filterOfferType) {
        query = query.eq('offer_type', filterOfferType);
      }
      
      const { data, error } = await query.order('name');

      if (!error && data) {
        // Retourner tous les workflows avec leur ID comme valeur
        setWorkflows(data.map(w => ({
          value: w.id,
          label: w.name,
          offer_type: w.offer_type
        })));
      }
      setLoading(false);
    };

    fetchWorkflows();
  }, [user?.id, filterOfferType]);

  return { workflows, loading };
};
