import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Broker } from '@/types/broker';

export const useBrokerData = () => {
  const [broker, setBroker] = useState<Broker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Référence pour éviter les re-fetches inutiles
  const hasFetchedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchBrokerData = useCallback(async (force = false) => {
    if (!user) {
      setBroker(null);
      setLoading(false);
      hasFetchedRef.current = false;
      lastUserIdRef.current = null;
      return;
    }

    // Ne pas re-fetcher si on a déjà les données pour cet utilisateur
    // sauf si c'est un refresh forcé
    if (!force && hasFetchedRef.current && lastUserIdRef.current === user.id) {
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
        hasFetchedRef.current = true;
        lastUserIdRef.current = user.id;
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
      hasFetchedRef.current = true;
      lastUserIdRef.current = user.id;
    } catch (err) {
      console.error('Error fetching broker data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBroker(null);
      hasFetchedRef.current = true;
      lastUserIdRef.current = user.id;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refresh = useCallback(() => {
    // Force refresh explicite
    fetchBrokerData(true);
  }, [fetchBrokerData]);

  useEffect(() => {
    // Ne refetcher que si l'utilisateur change réellement (ID différent)
    if (user?.id !== lastUserIdRef.current) {
      fetchBrokerData();
    }
  }, [user?.id, fetchBrokerData]);

  return {
    broker,
    loading,
    error,
    refresh,
  };
};
