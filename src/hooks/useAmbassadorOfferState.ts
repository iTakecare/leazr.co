
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Client } from "@/types/client";
import { Leaser } from "@/types/equipment";
import { defaultLeasers } from "@/data/leasers";
import { getLeasers } from "@/services/leaserService";
import { ClientSelectorClient } from "@/components/ui/ClientSelector";

export const useAmbassadorOfferState = () => {
  const { clientId, ambassadorId } = useParams();
  const { user } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLeasers, setLoadingLeasers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ambassador, setAmbassador] = useState(null);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [leaserSelectorOpen, setLeaserSelectorOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(defaultLeasers[0]);

  useEffect(() => {
    const fetchLeasers = async () => {
      try {
        setLoadingLeasers(true);
        const fetchedLeasers = await getLeasers();
        
        if (fetchedLeasers && fetchedLeasers.length > 0) {
          setSelectedLeaser(fetchedLeasers[0]);
        }
      } catch (error) {
        console.error("Error fetching leasers:", error);
        toast.error("Impossible de charger les prestataires de leasing. Utilisation des données par défaut.");
      } finally {
        setLoadingLeasers(false);
      }
    };
    
    fetchLeasers();
  }, []);

  useEffect(() => {
    if (clientId) {
      fetchClient(clientId);
    }
  }, [clientId]);

  useEffect(() => {
    if (ambassadorId) {
      fetchAmbassador(ambassadorId);
    } else if (user?.ambassador_id) {
      fetchAmbassador(user.ambassador_id);
    }
  }, [ambassadorId, user]);

  const fetchAmbassador = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ambassadors")
        .select("*, commission_levels(name)")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      setAmbassador(data);
      console.log("Ambassador data loaded:", data);
    } catch (error) {
      console.error("Erreur lors du chargement de l'ambassadeur:", error);
      toast.error("Impossible de charger les informations de l'ambassadeur");
    } finally {
      setLoading(false);
    }
  };

  const fetchClient = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error("Erreur lors du chargement du client:", error);
      toast.error("Impossible de charger les informations du client");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (selectedClient: ClientSelectorClient) => {
    console.log("Selected client in AmbassadorCreateOffer:", selectedClient);
    setClient({
      id: selectedClient.id,
      name: selectedClient.name,
      email: selectedClient.email || "",
      company: selectedClient.company || "",
      created_at: new Date(),
      updated_at: new Date()
    });
  };

  const handleLeaserSelect = (leaser: Leaser) => {
    setSelectedLeaser(leaser);
    setLeaserSelectorOpen(false);
  };

  return {
    client,
    setClient,
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
    setSelectedLeaser,
    ambassadorId,
    user,
    handleSelectClient,
    handleLeaserSelect
  };
};
