
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

        console.log("Found offers by client_id:", offersById ? offersById.length : 0);
        
        // Récupérer le nom et l'email du client pour chercher des offres associées
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('name, email')
          .eq('id', id)
          .single();
          
        if (clientError) {
          console.error("Error fetching client details:", clientError);
          if (offersById && offersById.length > 0) {
            setOffers(offersById);
            setLoading(false);
            return;
          }
          setLoading(false);
          setOffers([]);
          return;
        }
        
        if (!clientData) {
          console.log("Client data not found");
          if (offersById && offersById.length > 0) {
            setOffers(offersById);
            setLoading(false);
            return;
          }
          setLoading(false);
          setOffers([]);
          return;
        }
        
        console.log("Looking for offers by client name/email:", clientData.name, clientData.email);
        
        // Rechercher les offres par nom de client
        const { data: nameOffers, error: nameError } = await supabase
          .from('offers')
          .select('*')
          .ilike('client_name', clientData.name)
          .eq('converted_to_contract', false)
          .order('created_at', { ascending: false });
          
        if (nameError) {
          console.error("Error fetching offers by name:", nameError);
        }
        
        console.log("Found offers by client_name:", nameOffers ? nameOffers.length : 0);
        
        // Rechercher les offres par email client si disponible
        let emailOffers: any[] = [];
        if (clientData.email) {
          const { data: emailData, error: emailError } = await supabase
            .from('offers')
            .select('*')
            .ilike('client_email', clientData.email)
            .eq('converted_to_contract', false)
            .order('created_at', { ascending: false });
            
          if (emailError) {
            console.error("Error fetching offers by email:", emailError);
          } else {
            emailOffers = emailData || [];
            console.log("Found offers by client_email:", emailOffers.length);
          }
        }
        
        // Combiner toutes les offres trouvées
        const allOffers = [
          ...(offersById || []), 
          ...(nameOffers || []), 
          ...(emailOffers || [])
        ];
        
        // Supprimer les doublons en utilisant l'ID de l'offre
        const uniqueOffers = allOffers.filter((offer, index, self) =>
          index === self.findIndex((o) => o.id === offer.id)
        );
        
        console.log(`Found ${uniqueOffers.length} unique offers in total`);
        
        // Si des offres sont trouvées, mettre à jour client_id pour celles qui ne l'ont pas
        for (const offer of uniqueOffers) {
          if (!offer.client_id || offer.client_id !== id) {
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
        }
        
        setOffers(uniqueOffers);
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
