
import { useState, useEffect } from "react";
import { getOffersByClientId } from "@/services/offers/getOffers";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ClientOffer {
  id: string;
  client_name: string;
  created_at: string;
  equipment_description: string;
  amount: number;
  monthly_payment: number;
  status: string;
  workflow_status: string;
  signature_data?: string;
  signed_at?: string;
  signer_name?: string;
  equipment_data?: any;
}

export const useClientOffers = (clientEmail?: string) => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<ClientOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("useClientOffers: début du chargement des offres");
      
      if (!user?.client_id && !clientEmail) {
        console.warn("Aucun client_id ou email client fourni pour récupérer les offres");
        setOffers([]);
        setLoading(false);
        return;
      }
      
      const clientId = user?.client_id || "";
      console.log("Recherche d'offres pour le client:", clientId, clientEmail);
      
      let clientOffers: any[] = [];
      
      // Si nous avons un client_id, utiliser cette méthode de recherche
      if (clientId) {
        console.log("Utilisation du client_id pour récupérer les offres:", clientId);
        clientOffers = await getOffersByClientId(clientId);
      } 
      // Sinon, si nous avons un email, nous devons d'abord trouver le client
      else if (clientEmail) {
        console.log("Recherche du client par email:", clientEmail);
        
        // Rechercher le client par email
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('email', clientEmail)
          .single();
          
        if (clientError || !clientData) {
          console.error("Impossible de trouver le client avec cet email:", clientEmail);
          setError("Client introuvable");
          setLoading(false);
          return;
        }
        
        console.log("Client trouvé:", clientData.id);
        clientOffers = await getOffersByClientId(clientData.id);
      }
      
      console.log(`Total de ${clientOffers.length} offres récupérées pour le client`);
      setOffers(clientOffers);
    } catch (err: any) {
      console.error("Erreur dans useClientOffers:", err);
      setError(err.message || "Erreur lors du chargement des offres");
      toast.error("Impossible de charger vos offres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [user?.client_id, clientEmail]);

  return { offers, loading, error, refresh: fetchOffers };
};
