import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ClientData {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  status: string;
  created_at: string;
}

interface RecentActivity {
  id: string;
  type: 'offer' | 'contract' | 'request';
  title: string;
  description: string;
  date: string;
  status?: string;
}

export const useClientData = () => {
  const { user } = useAuth();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        console.log('Récupération des données client pour l\'utilisateur:', user.id);

        // Récupérer les informations du client associé à cet utilisateur
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (clientError) {
          console.error('Erreur lors de la récupération du client:', clientError);
          setError('Impossible de récupérer les informations du client');
          setLoading(false);
          return;
        }

        if (client) {
          setClientData(client);
          console.log('Données client récupérées:', client);

          // Récupérer l'activité récente du client
          await fetchRecentActivity(client.id);
        } else {
          setError('Aucun client associé à ce compte');
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données client:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentActivity = async (clientId: string) => {
      try {
        const activities: RecentActivity[] = [];

        // Récupérer les offres récentes
        const { data: offers, error: offersError } = await supabase
          .from('offers')
          .select('id, client_name, status, created_at, equipment_description')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!offersError && offers) {
          offers.forEach(offer => {
            activities.push({
              id: offer.id,
              type: 'offer',
              title: `Demande ${offer.status === 'pending' ? 'en attente' : offer.status === 'approved' ? 'approuvée' : 'soumise'}`,
              description: offer.equipment_description || 'Équipement non spécifié',
              date: offer.created_at,
              status: offer.status
            });
          });
        }

        // Récupérer les contrats récents
        const { data: contracts, error: contractsError } = await supabase
          .from('contracts')
          .select('id, client_name, status, created_at, equipment_description')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!contractsError && contracts) {
          contracts.forEach(contract => {
            activities.push({
              id: contract.id,
              type: 'contract',
              title: `Contrat ${contract.status === 'active' ? 'actif' : contract.status}`,
              description: contract.equipment_description || 'Équipement non spécifié',
              date: contract.created_at,
              status: contract.status
            });
          });
        }

        // Trier par date (plus récent en premier)
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setRecentActivity(activities.slice(0, 5)); // Garder seulement les 5 plus récents
      } catch (err) {
        console.error('Erreur lors de la récupération de l\'activité récente:', err);
      }
    };

    fetchClientData();
  }, [user?.id]);

  return {
    clientData,
    recentActivity,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setError(null);
      // Re-trigger useEffect by setting a state that will change
    }
  };
};