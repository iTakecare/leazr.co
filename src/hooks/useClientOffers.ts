
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
  client_id?: string;
  client_email?: string;
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
      
      console.log("Informations utilisateur:", user);
      console.log("Email client fourni:", clientEmail);
      
      let clientId = user?.client_id || "";
      let clientOffers: any[] = [];
      
      // Si nous avons un client_id, utiliser cette méthode de recherche
      if (clientId) {
        console.log("Utilisation du client_id pour récupérer les offres:", clientId);
        try {
          clientOffers = await getOffersByClientId(clientId);
          console.log(`Récupéré ${clientOffers.length} offres pour le client_id ${clientId}`);
        } catch (err) {
          console.error("Erreur lors de la récupération des offres par client_id:", err);
          setError("Erreur lors de la récupération des offres par client_id");
        }
      } 
      // Sinon, si nous avons un email, nous devons d'abord trouver le client
      else if (clientEmail) {
        console.log("Recherche du client par email:", clientEmail);
        
        // Rechercher le client par email
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('email', clientEmail)
          .maybeSingle();
          
        if (clientError) {
          console.error("Erreur lors de la recherche du client par email:", clientError);
          setError("Erreur lors de la recherche du client");
          setLoading(false);
          return;
        }
        
        if (clientData) {
          console.log("Client trouvé par email:", clientData.id);
          clientId = clientData.id;
          try {
            clientOffers = await getOffersByClientId(clientData.id);
            console.log(`Récupéré ${clientOffers.length} offres pour le client trouvé par email`);
          } catch (err) {
            console.error("Erreur lors de la récupération des offres du client trouvé par email:", err);
            setError("Erreur lors de la récupération des offres");
          }
        } else {
          console.log("Aucun client trouvé avec l'email:", clientEmail);
          
          // Recherche d'offres directement par email client
          try {
            const { data: emailOffers, error: emailOffersError } = await supabase
              .from('offers')
              .select('*, clients(name, email, company)')
              .ilike('client_email', clientEmail)
              .order('created_at', { ascending: false });
              
            if (emailOffersError) {
              throw emailOffersError;
            }
            
            console.log(`Récupéré ${emailOffers?.length || 0} offres directement par email client`);
            clientOffers = emailOffers || [];
          } catch (err) {
            console.error("Erreur lors de la recherche d'offres par email client:", err);
            setError("Erreur lors de la recherche d'offres");
          }
        }
      }
      
      if (clientOffers.length === 0) {
        console.log("Aucune offre trouvée pour ce client");
      } else {
        console.log(`Total de ${clientOffers.length} offres récupérées pour le client`);
      }
      
      setOffers(clientOffers);
    } catch (err: any) {
      console.error("Erreur générale dans useClientOffers:", err);
      setError(err.message || "Erreur lors du chargement des offres");
      toast.error("Impossible de charger vos offres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("useClientOffers: Déclenchement du chargement des offres");
    console.log("user?.client_id:", user?.client_id, "clientEmail:", clientEmail);
    fetchOffers();
    
    // Ajouter une subscription aux changements en temps réel
    if (user?.client_id) {
      const channel = supabase
        .channel('client-offers-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'offers',
          filter: `client_id=eq.${user.client_id}`
        }, () => {
          console.log('Changement détecté dans les offres, actualisation...');
          fetchOffers();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.client_id, clientEmail]);

  return { offers, loading, error, refresh: fetchOffers };
};
