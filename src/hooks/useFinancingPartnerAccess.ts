import { useState, useEffect } from 'react';
import { useParams } from "react-router";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Financeur, FinancingPartner } from '@/types/financeur';
import { getMyPartnerProfile } from '@/services/financingPartnerService';

/**
 * Accès au portail partenaire : l'utilisateur doit avoir une fiche
 * financing_partners active ET le slug doit correspondre au financeur
 * auquel il est rattaché.
 */
export const useFinancingPartnerAccess = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const { user } = useAuth();
  const [partner, setPartner] = useState<FinancingPartner | null>(null);
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
        const partnerProfile = await getMyPartnerProfile();
        if (!partnerProfile || partnerProfile.status !== 'active') {
          setHasAccess(false);
          return;
        }

        const { data: financeurData, error } = await supabase
          .rpc('get_financeur_by_slug' as any, { financeur_slug: companySlug });

        const financeurInfo = (financeurData as any[])?.[0];
        if (error || !financeurInfo || financeurInfo.id !== partnerProfile.company_id) {
          setHasAccess(false);
          return;
        }

        setPartner(partnerProfile);
        setFinanceur(financeurInfo as Financeur);
        setHasAccess(true);
      } catch (err) {
        console.error('Error checking financing partner access:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, companySlug]);

  return { partner, financeur, loading, hasAccess };
};
