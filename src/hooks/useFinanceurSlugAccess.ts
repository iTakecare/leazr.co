import { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Financeur } from '@/types/financeur';

export const useFinanceurSlugAccess = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [financeur, setFinanceur] = useState<Financeur | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !companySlug) {
        setLoading(false);
        setHasAccess(false);
        return;
      }

      try {
        const { data: financeurData, error: financeurError } = await supabase
          .rpc('get_financeur_by_slug' as any, { financeur_slug: companySlug });

        if (financeurError || !financeurData || (financeurData as any[]).length === 0) {
          console.error('Financeur not found or error:', financeurError);
          setHasAccess(false);
          navigate('/');
          return;
        }

        const financeurInfo = (financeurData as any[])[0];

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profile?.company_id === financeurInfo.id) {
          setFinanceur(financeurInfo as Financeur);
          setHasAccess(true);
        } else {
          setHasAccess(false);
          navigate('/');
        }
      } catch (err) {
        console.error('Error checking financeur access:', err);
        setHasAccess(false);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, companySlug, navigate]);

  return { financeur, loading, hasAccess };
};
