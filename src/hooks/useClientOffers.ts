
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getClientIdForUser } from "@/utils/clientUserAssociation";

export type ClientOffer = {
  id: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  monthly_payment: number;
  equipment_description?: string;
  amount: number;
  coefficient: number;
  commission?: number;
  status?: string;
  created_at: string;
  updated_at: string;
  converted_to_contract: boolean;
};

export const useClientOffers = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const fetchClientOffers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!user) {
          setLoading(false);
          setError("Utilisateur non connecté");
          return;
        }
        
        // Récupérer l'ID client pour l'utilisateur connecté
        const id = await getClientIdForUser(user.id, user.email || null);
        
        if (!id) {
          setLoading(false);
          setError("Compte client non trouvé. Veuillez contacter l'administrateur.");
          return;
        }
        
        setClientId(id);
        console.log("Fetching offers for client ID:", id);
        
        // Récupérer les offres par ID client
        const { data: offersById, error: offersByIdError } = await supabase
          .from('offers')
          .select('*')
          .eq('client_id', id)
          .eq('converted_to_contract', false)
          .order('created_at', { ascending: false });
          
        if (offersByIdError) {
          console.error("Error fetching offers by client_id:", offersByIdError);
          setError("Erreur lors de la récupération des offres");
          toast.error("Erreur lors du chargement des offres");
          setLoading(false);
          return;
        }
        
        // Si aucune offre n'est trouvée par client_id, essayer par client_name
        if (!offersById || offersById.length === 0) {
          // Récupérer le nom du client
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('name, email')
            .eq('id', id)
            .single();
            
          if (clientError || !clientData) {
            console.error("Error fetching client details:", clientError);
            setLoading(false);
            setOffers([]);
            return;
          }
          
          console.log("Looking for offers by client name:", clientData.name);
          
          // Rechercher les offres par nom de client
          const { data: nameOffers, error: nameError } = await supabase
            .from('offers')
            .select('*')
            .eq('client_name', clientData.name)
            .eq('converted_to_contract', false)
            .order('created_at', { ascending: false });
            
          if (nameError) {
            console.error("Error fetching offers by name:", nameError);
            setLoading(false);
            setOffers([]);
            return;
          }
          
          // Également rechercher par email client
          const { data: emailOffers, error: emailError } = await supabase
            .from('offers')
            .select('*')
            .eq('client_email', clientData.email)
            .eq('converted_to_contract', false)
            .order('created_at', { ascending: false });
            
          if (emailError) {
            console.error("Error fetching offers by email:", emailError);
          }
          
          // Combiner les résultats et supprimer les doublons
          const combinedOffers = [...(nameOffers || []), ...(emailOffers || [])];
          const uniqueOffers = combinedOffers.filter((offer, index, self) =>
            index === self.findIndex((o) => o.id === offer.id)
          );
          
          // Si des offres sont trouvées
          if (uniqueOffers.length > 0) {
            console.log(`Found ${uniqueOffers.length} offers by client name/email`);
            
            // Mettre à jour client_id pour ces offres
            for (const offer of uniqueOffers) {
              const { error: updateError } = await supabase
                .from('offers')
                .update({ client_id: id })
                .eq('id', offer.id);
                
              if (updateError) {
                console.error(`Error updating offer ${offer.id}:`, updateError);
              } else {
                console.log(`Updated client_id for offer ${offer.id}`);
              }
            }
            
            setOffers(uniqueOffers);
            setLoading(false);
            return;
          }
        }
        
        console.log("Fetched offers:", offersById);
        setOffers(offersById || []);
      } catch (error) {
        console.error("Error fetching client offers:", error);
        setError("Erreur lors de la récupération des offres");
        toast.error("Erreur lors du chargement des offres");
      } finally {
        setLoading(false);
      }
    };

    fetchClientOffers();
  }, [user, retry]);

  const refresh = () => {
    // Clear cache and retry
    if (user) {
      localStorage.removeItem(`client_id_${user.id}`);
    }
    setLoading(true);
    setOffers([]);
    setRetry(prev => prev + 1);
  };

  return {
    offers,
    loading,
    error,
    clientId,
    refresh
  };
};
