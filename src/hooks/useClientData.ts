import { useState, useEffect } from 'react';
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

interface ClientStats {
  totalMonthly: number;
  activeEquipment: number;
  pendingRequests: number;
  nextRenewal: string | null;
}

interface ClientNotification {
  id: string;
  type: 'warning' | 'info' | 'action';
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export const useClientData = () => {
  const { user } = useAuth();
  const { services } = useMultiTenant();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [clientStats, setClientStats] = useState<ClientStats>({ totalMonthly: 0, activeEquipment: 0, pendingRequests: 0, nextRenewal: null });
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch client by user_id
        const { data: client, error: clientError } = await services.clients.query()
          .select('*, has_custom_catalog')
          .eq('user_id', user.id)
          .maybeSingle();

        if (clientError) {
          console.error('Erreur lors de la récupération du client:', clientError);
          setError('Impossible de récupérer les informations du client');
          setLoading(false);
          return;
        }

        let resolvedClient = client;

        if (!client) {
          // Fallback: search by email
          const { data: clientByEmail, error: emailError } = await services.clients.query()
            .select('*, has_custom_catalog')
            .eq('email', user.email)
            .maybeSingle();

          if (emailError) {
            setError('Impossible de récupérer les informations du client');
            setLoading(false);
            return;
          }
          if (!clientByEmail) {
            setError('Aucun client associé à ce compte. Veuillez contacter l\'administrateur pour créer votre fiche client.');
            setLoading(false);
            return;
          }
          resolvedClient = clientByEmail;
        }

        setClientData(resolvedClient);

        // Fetch all enriched data in parallel
        await Promise.all([
          fetchRecentActivity(resolvedClient!.id),
          fetchClientStats(resolvedClient!.id),
          fetchNotifications(resolvedClient!.id),
        ]);
      } catch (err) {
        console.error('Erreur lors du chargement des données client:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    const fetchClientStats = async (clientId: string) => {
      try {
        // Active contracts + sum monthly payments
        const { data: activeContracts } = await services.contracts.query()
          .select('id, monthly_payment, end_date')
          .eq('client_id', clientId)
          .eq('status', 'active');

        const totalMonthly = (activeContracts || []).reduce((sum, c) => sum + (c.monthly_payment || 0), 0);
        const activeEquipment = (activeContracts || []).length;

        // Find next renewal
        const futureEnds = (activeContracts || [])
          .map(c => c.end_date)
          .filter(Boolean)
          .sort();
        const nextRenewal = futureEnds.length > 0 ? futureEnds[0] : null;

        // Pending offers count
        const { count: pendingCount } = await services.offers.query()
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .in('status', ['pending', 'sent']);

        setClientStats({
          totalMonthly,
          activeEquipment,
          pendingRequests: pendingCount || 0,
          nextRenewal,
        });
      } catch (err) {
        console.error('Erreur stats client:', err);
      }
    };

    const fetchNotifications = async (clientId: string) => {
      try {
        const notifs: ClientNotification[] = [];

        // Contracts to sign
        const { data: toSign } = await services.contracts.query()
          .select('id, equipment_description')
          .eq('client_id', clientId)
          .eq('status', 'contract_sent');

        (toSign || []).forEach(c => {
          notifs.push({
            id: `sign-${c.id}`,
            type: 'action',
            title: 'Contrat à signer',
            description: parseEquipmentTitle(c.equipment_description) || 'Un contrat attend votre signature',
            actionLabel: 'Voir le contrat',
            actionHref: 'contracts',
          });
        });

        // Offers approved but not yet converted
        const { data: approved } = await services.offers.query()
          .select('id, equipment_description')
          .eq('client_id', clientId)
          .eq('status', 'approved')
          .eq('converted_to_contract', false);

        (approved || []).forEach(o => {
          notifs.push({
            id: `approved-${o.id}`,
            type: 'info',
            title: 'Demande approuvée',
            description: parseEquipmentTitle(o.equipment_description) || 'Votre demande a été approuvée',
            actionLabel: 'Voir la demande',
            actionHref: 'requests',
          });
        });

        setNotifications(notifs);
      } catch (err) {
        console.error('Erreur notifications:', err);
      }
    };

    const fetchRecentActivity = async (clientId: string) => {
      try {
        const activities: RecentActivity[] = [];

        const { data: offers } = await services.offers.query()
          .select('id, client_name, status, created_at, equipment_description')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(3);

        (offers || []).forEach(offer => {
          activities.push({
            id: offer.id,
            type: 'offer',
            title: `Demande de financement ${getOfferStatusText(offer.status)}`,
            description: parseEquipmentTitle(offer.equipment_description) || 'Équipement non spécifié',
            date: offer.created_at,
            status: offer.status,
          });
        });

        const { data: contracts } = await services.contracts.query()
          .select('id, client_name, status, created_at, equipment_description')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(3);

        (contracts || []).forEach(contract => {
          activities.push({
            id: contract.id,
            type: 'contract',
            title: `Contrat de financement ${getContractStatusText(contract.status)}`,
            description: parseEquipmentTitle(contract.equipment_description) || 'Équipement non spécifié',
            date: contract.created_at,
            status: contract.status,
          });
        });

        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivity(activities.slice(0, 5));
      } catch (err) {
        console.error('Erreur activité récente:', err);
      }
    };

    fetchClientData();
  }, [user?.id]);

  return { clientData, recentActivity, clientStats, notifications, loading, error };
};

// --- Helpers ---

function parseEquipmentTitle(desc: string | null | undefined): string | null {
  if (!desc) return null;
  try {
    const data = JSON.parse(desc);
    if (Array.isArray(data) && data.length > 0) {
      const titles = data.map((item: any) => item.title).filter(Boolean);
      if (titles.length > 0) {
        return titles.length > 1 ? `${titles[0]} et ${titles.length - 1} autre(s)` : titles[0];
      }
    }
    return null;
  } catch {
    return desc;
  }
}

function getOfferStatusText(status: string) {
  switch (status) {
    case 'pending': return 'en attente';
    case 'approved': return 'approuvée';
    case 'rejected': return 'refusée';
    case 'sent': return 'envoyée';
    default: return status;
  }
}

function getContractStatusText(status: string) {
  switch (status) {
    case 'active': return 'actif';
    case 'contract_sent': return 'envoyé pour signature';
    case 'equipment_ordered': return 'équipement commandé';
    case 'completed': return 'terminé';
    default: return status;
  }
}
