import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useMultiTenant } from './useMultiTenant';
import { Client } from '@/types/client';

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
  const { services } = useMultiTenant();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user?.id) {
        console.log('🔍 CLIENT DATA - Pas d\'utilisateur connecté');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 CLIENT DATA - Récupération des données client pour l\'utilisateur:', user.id);
        console.log('🔍 CLIENT DATA - Email utilisateur:', user.email);

        // Récupérer les informations du client associé à cet utilisateur
        const { data: client, error: clientError } = await services.clients.query()
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (clientError) {
          console.error('Erreur lors de la récupération du client:', clientError);
          setError('Impossible de récupérer les informations du client');
          setLoading(false);
          return;
        }

        if (client) {
          setClientData(client);
          console.log('🔍 CLIENT DATA - Données client récupérées par user_id:', client);

          // Récupérer l'activité récente du client
          await fetchRecentActivity(client.id);
        } else {
          console.log('🔍 CLIENT DATA - Aucun client trouvé pour user_id:', user.id);
          
          // Essayer aussi de chercher par email si aucun client n'est trouvé par user_id
          const { data: clientByEmail, error: emailError } = await services.clients.query()
            .select('*')
            .eq('email', user.email)
            .maybeSingle();

          if (emailError) {
            console.error('Erreur lors de la recherche par email:', emailError);
            setError('Impossible de récupérer les informations du client');
          } else if (clientByEmail) {
            setClientData(clientByEmail);
            console.log('🔍 CLIENT DATA - Client trouvé par email:', clientByEmail);
            await fetchRecentActivity(clientByEmail.id);
          } else {
            console.log('🔍 CLIENT DATA - Aucun client trouvé par email non plus');
            setError('Aucun client associé à ce compte. Veuillez contacter l\'administrateur pour créer votre fiche client.');
          }
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
        const { data: offers, error: offersError } = await services.offers.query()
          .select('id, client_name, status, created_at, equipment_description')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!offersError && offers) {
          offers.forEach(offer => {
            const getStatusText = (status: string) => {
              switch(status) {
                case 'pending': return 'en attente de validation';
                case 'approved': return 'approuvée';
                case 'rejected': return 'refusée';
                case 'sent': return 'envoyée au client';
                default: return status;
              }
            };

            // Formatage de la description d'équipement
            let equipmentDesc = 'Équipement non spécifié';
            if (offer.equipment_description) {
              try {
                // Si c'est du JSON, essayer de le parser et extraire les informations utiles
                const equipmentData = JSON.parse(offer.equipment_description);
                if (Array.isArray(equipmentData) && equipmentData.length > 0) {
                  const titles = equipmentData.map(item => item.title).filter(Boolean);
                  if (titles.length > 0) {
                    equipmentDesc = titles.length > 1 
                      ? `${titles[0]} et ${titles.length - 1} autre(s) équipement(s)`
                      : titles[0];
                  }
                }
              } catch {
                // Si ce n'est pas du JSON, utiliser tel quel
                equipmentDesc = offer.equipment_description;
              }
            }

            activities.push({
              id: offer.id,
              type: 'offer',
              title: `Demande de financement ${getStatusText(offer.status)}`,
              description: equipmentDesc,
              date: offer.created_at,
              status: offer.status
            });
          });
        }

        // Récupérer les contrats récents
        const { data: contracts, error: contractsError } = await services.contracts.query()
          .select('id, client_name, status, created_at, equipment_description')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!contractsError && contracts) {
          contracts.forEach(contract => {
            const getContractStatusText = (status: string) => {
              switch(status) {
                case 'active': return 'actif';
                case 'contract_sent': return 'envoyé pour signature';
                case 'equipment_ordered': return 'équipement commandé';
                case 'completed': return 'terminé';
                default: return status;
              }
            };

            // Formatage de la description d'équipement pour les contrats aussi
            let equipmentDesc = 'Équipement non spécifié';
            if (contract.equipment_description) {
              try {
                const equipmentData = JSON.parse(contract.equipment_description);
                if (Array.isArray(equipmentData) && equipmentData.length > 0) {
                  const titles = equipmentData.map(item => item.title).filter(Boolean);
                  if (titles.length > 0) {
                    equipmentDesc = titles.length > 1 
                      ? `${titles[0]} et ${titles.length - 1} autre(s) équipement(s)`
                      : titles[0];
                  }
                }
              } catch {
                equipmentDesc = contract.equipment_description;
              }
            }

            activities.push({
              id: contract.id,
              type: 'contract',
              title: `Contrat de financement ${getContractStatusText(contract.status)}`,
              description: equipmentDesc,
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