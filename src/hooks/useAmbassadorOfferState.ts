
import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";
import { useAuth } from "@/context/AuthContext";
import { Leaser } from "@/types/equipment";
import { defaultLeasers } from "@/data/leasers";
import { getLeasers } from "@/services/leaserService";
import { ClientSelectorClient } from "@/components/ui/ClientSelector";

export const useAmbassadorOfferState = () => {
  const location = useLocation();
  const { clientId, ambassadorId: paramAmbassadorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLeasers, setLoadingLeasers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ambassador, setAmbassador] = useState(null);
  const [ambassadorId, setAmbassadorId] = useState<string | null>(null);
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
    console.log("useAmbassadorOfferState - useEffect triggered:", { 
      paramAmbassadorId, 
      userId: user?.id, 
      userRole: user?.role 
    });
    
    if (paramAmbassadorId) {
      console.log("useAmbassadorOfferState - Using paramAmbassadorId:", paramAmbassadorId);
      fetchAmbassador(paramAmbassadorId);
      setAmbassadorId(paramAmbassadorId);
    } else if (user?.id) {
      console.log("useAmbassadorOfferState - Fetching ambassador by user ID:", user.id);
      // Récupérer l'ambassadeur associé à cet utilisateur
      fetchAmbassadorByUserId(user.id);
    }
  }, [paramAmbassadorId, user?.id]);

  const fetchAmbassadorByUserId = async (userId: string) => {
    try {
      setLoading(true);
      console.log("🔍 fetchAmbassadorByUserId - Starting with userId:", userId);
      
      const { data, error } = await supabase
        .from("ambassadors")
        .select("*, commission_levels(name)")
        .eq("user_id", userId)
        .single();
      
      console.log("🔍 fetchAmbassadorByUserId - Query result:", { data, error });
      
      if (error) {
        console.error("🔍 fetchAmbassadorByUserId - Error:", error);
        return;
      }
      
      if (data) {
        console.log("🔍 fetchAmbassadorByUserId - Ambassador found:", data);
        setAmbassador(data);
        setAmbassadorId(data.id);
        console.log("🔍 fetchAmbassadorByUserId - State updated with ambassadorId:", data.id);
      } else {
        console.log("🔍 fetchAmbassadorByUserId - No ambassador found for user:", userId);
      }
    } catch (error) {
      console.error("🔍 fetchAmbassadorByUserId - Catch error:", error);
    } finally {
      setLoading(false);
    }
  };
  
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

  // Log des états pour debug
  console.log("🔍 useAmbassadorOfferState - Current state:", {
    ambassadorId,
    ambassador: ambassador ? { id: ambassador.id, commission_level_id: ambassador.commission_level_id } : null,
    loading,
    userId: user?.id
  });

  return {
    client,
    loading,
    loadingLeasers,
    isSubmitting,
    setIsSubmitting,
    ambassador,
    ambassadorId,
    clientSelectorOpen,
    setClientSelectorOpen,
    leaserSelectorOpen,
    setLeaserSelectorOpen,
    remarks,
    setRemarks,
    selectedLeaser,
    user,
    handleSelectClient,
    handleLeaserSelect
  };
};
