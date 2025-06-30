
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getLeasers } from '@/services/leaserService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAmbassadorOfferState = () => {
  const { user, isAmbassador } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLeasers, setLoadingLeasers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ambassador, setAmbassador] = useState<any>(null);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [leaserSelectorOpen, setLeaserSelectorOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [selectedLeaser, setSelectedLeaser] = useState<any>(null);
  const [ambassadorId, setAmbassadorId] = useState<string>('');

  // Charger les données de l'ambassadeur connecté
  useEffect(() => {
    const loadAmbassadorData = async () => {
      if (!user?.id || !isAmbassador()) {
        console.log("🔍 useAmbassadorOfferState - User not authenticated or not ambassador");
        setLoading(false);
        return;
      }

      try {
        console.log("🔍 useAmbassadorOfferState - Loading ambassador data for user:", user.id);
        
        const { data: ambassadorData, error } = await supabase
          .from('ambassadors')
          .select(`
            id,
            name,
            email,
            commission_level_id,
            company_id,
            commission_levels (
              id,
              name,
              type
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error("❌ useAmbassadorOfferState - Error loading ambassador:", error);
          toast.error("Impossible de charger les données de l'ambassadeur");
          setLoading(false);
          return;
        }

        if (!ambassadorData) {
          console.error("❌ useAmbassadorOfferState - No ambassador found for user:", user.id);
          toast.error("Aucun profil ambassadeur trouvé pour cet utilisateur");
          setLoading(false);
          return;
        }

        // Vérifier que l'ambassadeur a un company_id
        if (!ambassadorData.company_id) {
          console.error("❌ useAmbassadorOfferState - Ambassador without company_id:", ambassadorData);
          toast.error("Erreur: L'ambassadeur n'a pas de company_id assigné. Contactez l'administrateur.");
          setLoading(false);
          return;
        }

        console.log("✅ useAmbassadorOfferState - Ambassador loaded successfully:", {
          id: ambassadorData.id,
          name: ambassadorData.name,
          company_id: ambassadorData.company_id,
          commission_level_id: ambassadorData.commission_level_id
        });

        setAmbassador(ambassadorData);
        setAmbassadorId(ambassadorData.id);
      } catch (error) {
        console.error("❌ useAmbassadorOfferState - Unexpected error:", error);
        toast.error("Erreur lors du chargement des données de l'ambassadeur");
      } finally {
        setLoading(false);
      }
    };

    loadAmbassadorData();
  }, [user?.id, isAmbassador]);

  // Charger les leasers
  useEffect(() => {
    const loadLeasers = async () => {
      try {
        console.log("🔍 useAmbassadorOfferState - Loading leasers...");
        const leasers = await getLeasers();
        
        if (leasers && leasers.length > 0) {
          console.log("✅ useAmbassadorOfferState - Leasers loaded:", leasers.length);
          setSelectedLeaser(leasers[0]);
        } else {
          console.warn("⚠️ useAmbassadorOfferState - No leasers found");
        }
      } catch (error) {
        console.error("❌ useAmbassadorOfferState - Error loading leasers:", error);
        toast.error("Erreur lors du chargement des leasers");
      } finally {
        setLoadingLeasers(false);
      }
    };

    loadLeasers();
  }, []);

  const handleSelectClient = (selectedClient: any) => {
    console.log("🔍 useAmbassadorOfferState - Client selected:", selectedClient);
    setClient(selectedClient);
    setClientSelectorOpen(false);
  };

  const handleLeaserSelect = (leaser: any) => {
    console.log("🔍 useAmbassadorOfferState - Leaser selected:", leaser);
    setSelectedLeaser(leaser);
    setLeaserSelectorOpen(false);
  };

  return {
    client,
    loading,
    loadingLeasers,
    isSubmitting,
    setIsSubmitting,
    ambassador,
    clientSelectorOpen,
    setClientSelectorOpen,
    leaserSelectorOpen,
    setLeaserSelectorOpen,
    remarks,
    setRemarks,
    selectedLeaser,
    ambassadorId,
    user,
    handleSelectClient,
    handleLeaserSelect
  };
};
