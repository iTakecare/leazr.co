
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useCompanyId = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user) {
        setCompanyId(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Première tentative : récupération directe du profil
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profileError && profile?.company_id) {
          setCompanyId(profile.company_id);
          setLoading(false);
          return;
        }

        // Deuxième tentative : utiliser la fonction RPC
        const { data: companyIdFromFunction, error: functionError } = await supabase
          .rpc('get_user_company_id');

        if (!functionError && companyIdFromFunction) {
          setCompanyId(companyIdFromFunction);
          setLoading(false);
          return;
        }

        // Troisième tentative : récupérer depuis les métadonnées utilisateur
        const userMetadata = user.user_metadata;
        if (userMetadata?.company_id) {
          setCompanyId(userMetadata.company_id);
          setLoading(false);
          return;
        }

        // Dernière tentative : rechercher une entreprise par défaut
        const { data: defaultCompany, error: defaultCompanyError } = await supabase
          .from('companies')
          .select('id')
          .eq('name', 'iTakecare (Default)')
          .single();

        if (!defaultCompanyError && defaultCompany) {
          setCompanyId(defaultCompany.id);
        } else {
          setError('Impossible de récupérer l\'ID de l\'entreprise');
        }
      } catch (err) {
        console.error('Error fetching company ID:', err);
        setError('Erreur lors de la récupération de l\'ID de l\'entreprise');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyId();
  }, [user]);

  return { companyId, loading, error };
};
