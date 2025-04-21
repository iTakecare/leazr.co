
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Offer } from '@/types/offer';
import { toast } from 'sonner';

export const useClientOffers = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  const fetchOffers = async (clientEmail?: string) => {
    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching client offers for user:", user.id);
      
      // Récupérer les offres pour les clients liés à l'utilisateur
      let { data: clientOffers, error: offersError } = await supabase
        .from('offers')
        .select(`
          *,
          clients!offers_client_id_fkey (
            id,
            name,
            company
          )
        `)
        .eq('user_id', user.id);

      if (offersError) {
        console.error("Error fetching offers:", offersError);
        throw new Error("Erreur lors de la récupération des offres");
      }

      // Récupérer les informations du profil pour les offres
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError);
      }
      
      const profile = profileData || { first_name: '', last_name: '' };

      if (clientOffers) {
        console.log(`Found ${clientOffers.length} offers for user`);
        
        // Transformer les données pour utilisation dans l'interface
        const formattedOffers = clientOffers.map(offer => ({
          ...offer,
          clientName: offer.clients?.name || offer.client_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Client sans nom',
          clientCompany: offer.clients?.company || ''
        }));
        
        setOffers(formattedOffers);
      } else {
        setOffers([]);
      }
    } catch (err) {
      console.error("Error in useClientOffers:", err);
      setError(err instanceof Error ? err : new Error('Une erreur est survenue'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [user]);

  // Add the expected properties using the same names the components expect
  return { 
    offers, 
    isLoading, 
    error,
    // Aliases for backward compatibility
    loading: isLoading,
    refresh: fetchOffers
  };
};
