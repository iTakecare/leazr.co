
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAmbassadorByUserId } from '@/services/ambassadorService';
import { getLeasers } from '@/services/leaserService';
import { defaultLeasers } from '@/data/leasers';
import { Client } from '@/types/client';
import { Leaser } from '@/types/equipment';
import { ClientSelectorClient } from '@/components/ui/ClientSelector';

export const useAmbassadorOfferState = () => {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLeasers, setLoadingLeasers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ambassador, setAmbassador] = useState<any>(null);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [leaserSelectorOpen, setLeaserSelectorOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(defaultLeasers[0]);

  // L'ID de l'ambassadeur sera récupéré depuis les données de l'ambassadeur
  const ambassadorId = ambassador?.id;

  useEffect(() => {
    const loadAmbassadorData = async () => {
      if (!user?.id) {
        console.log("No user ID found");
        setLoading(false);
        return;
      }

      try {
        console.log("Loading ambassador data for user ID:", user.id);
        const ambassadorData = await getAmbassadorByUserId(user.id);
        
        if (ambassadorData) {
          console.log("Ambassador data loaded:", ambassadorData);
          setAmbassador(ambassadorData);
        } else {
          console.log("No ambassador found for this user");
        }
      } catch (error) {
        console.error("Error loading ambassador data:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadLeasers = async () => {
      try {
        const fetchedLeasers = await getLeasers();
        if (fetchedLeasers && fetchedLeasers.length > 0) {
          setSelectedLeaser(fetchedLeasers[0]);
        }
      } catch (error) {
        console.error("Error fetching leasers:", error);
      } finally {
        setLoadingLeasers(false);
      }
    };

    loadAmbassadorData();
    loadLeasers();
  }, [user?.id]);

  const handleSelectClient = (selectedClient: ClientSelectorClient) => {
    setClient({
      id: selectedClient.id,
      name: selectedClient.name,
      email: selectedClient.email || "",
      company: selectedClient.company || "",
      created_at: new Date(),
      updated_at: new Date()
    });
    setClientSelectorOpen(false);
  };

  const handleLeaserSelect = (leaser: Leaser) => {
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
