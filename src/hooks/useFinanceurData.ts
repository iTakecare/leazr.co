import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Financeur } from '@/types/financeur';

export const useFinanceurData = () => {
  const [financeur, setFinanceur] = useState<Financeur | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const hasFetchedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchFinanceurData = useCallback(async (force = false) => {
    if (!user) {
      setFinanceur(null);
      setLoading(false);
      hasFetchedRef.current = false;
      lastUserIdRef.current = null;
      return;
    }

    if (!force && hasFetchedRef.current && lastUserIdRef.current === user.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.company_id) {
        setFinanceur(null);
        setLoading(false);
        hasFetchedRef.current = true;
        lastUserIdRef.current = user.id;
        return;
      }

      const { data: financeurData, error: financeurError } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color, modules_enabled, company_type, is_active, created_at, updated_at')
        .eq('id', profile.company_id)
        .eq('company_type', 'financeur')
        .single();

      if (financeurError) throw financeurError;

      setFinanceur(financeurData as unknown as Financeur);
      hasFetchedRef.current = true;
      lastUserIdRef.current = user.id;
    } catch (err) {
      console.error('Error fetching financeur data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFinanceur(null);
      hasFetchedRef.current = true;
      lastUserIdRef.current = user.id;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refresh = useCallback(() => {
    fetchFinanceurData(true);
  }, [fetchFinanceurData]);

  useEffect(() => {
    if (user?.id !== lastUserIdRef.current) {
      fetchFinanceurData();
    }
  }, [user?.id, fetchFinanceurData]);

  return { financeur, loading, error, refresh };
};
