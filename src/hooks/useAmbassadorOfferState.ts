
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Client } from "@/types/client";
import { Leaser } from "@/types/equipment";
import { defaultLeasers } from "@/data/leasers";
import { getLeasers } from "@/services/leaserService";
import { ClientSelectorClient } from "@/components/ui/ClientSelector";

export const useAmbassadorOfferState = () => {
  const { clientId, ambassadorId } = useParams();
  const { user, ambassadorId: authAmbassadorId } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLeasers, setLoadingLeasers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ambassador, setAmbassador] = useState<any>(null);
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
    // Améliorer la logique de récupération de l'ambassadeur
    const targetAmbassadorId = ambassadorId || authAmbassadorId;
    console.log("🔍 DIAGNOSTIC - Récupération ambassadeur:", {
      ambassadorIdFromParams: ambassadorId,
      authAmbassadorId: authAmbassadorId,
      targetAmbassadorId,
      user: user
    });
    
    if (targetAmbassadorId) {
      fetchAmbassador(targetAmbassadorId);
    } else if (user?.id) {
      // Si pas d'ambassador_id direct, essayer de trouver l'ambassadeur via l'ID utilisateur
      fetchAmbassadorByUserId(user.id);
    }
  }, [ambassadorId, authAmbassadorId, user]);

  const fetchAmbassadorByUserId = async (userId: string) => {
    try {
      setLoading(true);
      console.log("🔍 DIAGNOSTIC - Recherche ambassadeur par user_id:", userId);
      
      const { data, error } = await supabase
        .from("ambassadors")
        .select("*, commission_levels(name)")
        .eq("user_id", userId)
        .single();
      
      if (error) {
        console.error("🔍 DIAGNOSTIC - Erreur recherche ambassadeur par user_id:", error);
        throw error;
      }
      
      console.log("🔍 DIAGNOSTIC - Ambassadeur trouvé par user_id:", data);
      setAmbassador(data);
    } catch (error) {
      console.error("Erreur lors du chargement de l'ambassadeur par user_id:", error);
      toast.error("Impossible de charger les informations de l'ambassadeur");
    } finally {
      setLoading(false);
    }
  };

  const fetchAmbassador = async (id: string) => {
    try {
      setLoading(true);
      console.log("🔍 DIAGNOSTIC - Recherche ambassadeur par ID:", id);
      
      const { data, error } = await supabase
        .from("ambassadors")
        .select("*, commission_levels(name)")
        .eq("id", id)
        .single();
      
      if (error) {
        console.error("🔍 DIAGNOSTIC - Erreur recherche ambassadeur par ID:", error);
        throw error;
      }
      
      console.log("🔍 DIAGNOSTIC - Ambassadeur trouvé par ID:", data);
      setAmbassador(data);
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
    console.log("Selected client in useAmbassadorOfferState:", selectedClient);
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
    ambassadorId: ambassadorId || ambassador?.id,
    user,
    handleSelectClient,
    handleLeaserSelect
  };
};
