import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the company context for an ambassador user
 * This fetches the company_id from the ambassadors table based on the current user
 */
export const useAmbassadorCompanyContext = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAmbassadorCompany = async () => {
      if (!user) {
        setCompanyId(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch ambassador record for the current user
        const { data: ambassadorData, error: ambassadorError } = await supabase
          .from('ambassadors')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (ambassadorError) {
          console.error('❌ AMBASSADOR COMPANY - Error fetching ambassador:', ambassadorError);
          setError(new Error('Erreur lors de la récupération des données ambassadeur'));
          setCompanyId(null);
          return;
        }

        if (ambassadorData?.company_id) {
          console.log('✅ AMBASSADOR COMPANY - Company found:', ambassadorData.company_id);
          setCompanyId(ambassadorData.company_id);
        } else {
          console.log('❌ AMBASSADOR COMPANY - No company found for user');
          setCompanyId(null);
        }
      } catch (err) {
        console.error('❌ AMBASSADOR COMPANY - Unexpected error:', err);
        setError(err instanceof Error ? err : new Error('Erreur inconnue'));
        setCompanyId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAmbassadorCompany();
  }, [user?.id]);

  return {
    companyId,
    loading,
    error
  };
};