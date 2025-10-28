import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Broker } from '@/types/broker';

export const useBrokerData = () => {
  const [broker, setBroker] = useState<Broker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchBrokerData = useCallback(async () => {
    if (!user) {
      setBroker(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer le company_id depuis profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.company_id) {
        setBroker(null);
        setLoading(false);
        return;
      }

      // Récupérer les données du broker
      const { data: brokerData, error: brokerError } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color, modules_enabled, company_type, is_active, created_at, updated_at')
        .eq('id', profile.company_id)
        .eq('company_type', 'broker')
        .single();

      if (brokerError) throw brokerError;

      setBroker(brokerData as Broker);
    } catch (err) {
      console.error('Error fetching broker data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBroker(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refresh = useCallback(() => {
    fetchBrokerData();
  }, [fetchBrokerData]);

  useEffect(() => {
    fetchBrokerData();
  }, [fetchBrokerData]);

  return {
    broker,
    loading,
    error,
    refresh,
  };
};
