import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SaaSCompany {
  id: string;
  name: string;
  logo_url?: string;
  plan: string;
  account_status: string;
  created_at: string;
  trial_ends_at?: string;
  subscription_ends_at?: string;
  modules_enabled?: string[];
  user_count: number;
  primary_admin?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface SaaSCompaniesStats {
  total: number;
  active: number;
  trial: number;
  monthlyRevenue: number;
}

export const useSaaSCompanies = () => {
  const [companies, setCompanies] = useState<SaaSCompany[]>([]);
  const [stats, setStats] = useState<SaaSCompaniesStats>({
    total: 0,
    active: 0,
    trial: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        console.log("🏢 SAAS COMPANIES - Récupération des entreprises clientes");

        // Récupérer les entreprises clientes (exclure Leazr et les entreprises internes)
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            logo_url,
            plan,
            account_status,
            created_at,
            trial_ends_at,
            subscription_ends_at,
            modules_enabled
          `)
          .neq('name', 'Leazr')
          .neq('id', 'c9a58d2c-8c7f-4e8a-9f2b-1e5d3c4b8a7f') // Exclure l'ID spécifique de Leazr si nécessaire
          .order('created_at', { ascending: false });

        if (companiesError) {
          console.error("❌ SAAS COMPANIES - Erreur entreprises:", companiesError);
          throw companiesError;
        }

        console.log("🏢 SAAS COMPANIES - Entreprises récupérées:", companiesData?.length || 0);

        if (!companiesData || companiesData.length === 0) {
          setCompanies([]);
          setStats({ total: 0, active: 0, trial: 0, monthlyRevenue: 0 });
          return;
        }

        // Récupérer les administrateurs principaux pour chaque entreprise
        const companyIds = companiesData.map(c => c.id);
        console.log("🔍 SAAS COMPANIES - Recherche des admins pour:", companyIds.length, "entreprises");
        
        const { data: adminsData, error: adminsError } = await supabase
          .from('profiles')
          .select('id, company_id, first_name, last_name, role, email')
          .in('company_id', companyIds)
          .eq('role', 'admin')
          .order('created_at', { ascending: true }); // Premier admin créé = admin principal

        if (adminsError) {
          console.error("❌ SAAS COMPANIES - Erreur admins:", adminsError);
        } else {
          console.log("👥 SAAS COMPANIES - Admins trouvés:", adminsData?.length || 0);
        }

        // Compter les utilisateurs par entreprise (exclure les super_admin)
        const { data: usersCount, error: usersError } = await supabase
          .from('profiles')
          .select('company_id, id')
          .in('company_id', companyIds)
          .neq('role', 'super_admin');

        const usersCountMap = new Map();
        if (!usersError && usersCount) {
          usersCount.forEach(user => {
            const count = usersCountMap.get(user.company_id) || 0;
            usersCountMap.set(user.company_id, count + 1);
          });
        }

        // Créer le map des admins par entreprise
        const adminsMap = new Map();
        if (adminsData) {
          adminsData.forEach(admin => {
            if (!adminsMap.has(admin.company_id)) {
              adminsMap.set(admin.company_id, {
                first_name: admin.first_name || '',
                last_name: admin.last_name || '',
                email: admin.email || 'Email non disponible'
              });
            }
          });
        }

        // Fonction pour calculer le statut intelligent
        const getSmartStatus = (company: any): string => {
          const now = new Date();
          
          // Si subscription_ends_at existe et est dans le futur → active
          if (company.subscription_ends_at) {
            const subscriptionEnd = new Date(company.subscription_ends_at);
            if (subscriptionEnd > now) {
              return 'active';
            } else {
              return 'expired';
            }
          }
          
          // Si trial_ends_at existe et est dans le futur → trial
          if (company.trial_ends_at) {
            const trialEnd = new Date(company.trial_ends_at);
            if (trialEnd > now) {
              return 'trial';
            } else {
              return 'expired';
            }
          }
          
          // Fallback sur account_status de la DB
          return company.account_status || 'pending';
        };

        // Combiner toutes les données avec statut intelligent
        const enrichedCompanies: SaaSCompany[] = companiesData.map(company => {
          const smartStatus = getSmartStatus(company);
          return {
            id: company.id,
            name: company.name,
            logo_url: company.logo_url,
            plan: company.plan,
            account_status: smartStatus,
            created_at: company.created_at,
            trial_ends_at: company.trial_ends_at,
            subscription_ends_at: company.subscription_ends_at,
            modules_enabled: company.modules_enabled || [],
            user_count: usersCountMap.get(company.id) || 0,
            primary_admin: adminsMap.get(company.id)
          };
        });

        // Calculer les statistiques avec le statut intelligent
        const planPrices = { starter: 49, pro: 149, business: 299 };
        const calculatedStats: SaaSCompaniesStats = {
          total: enrichedCompanies.length,
          active: enrichedCompanies.filter(c => c.account_status === 'active').length,
          trial: enrichedCompanies.filter(c => c.account_status === 'trial').length,
          monthlyRevenue: enrichedCompanies
            .filter(c => c.account_status === 'active')
            .reduce((total, c) => total + (planPrices[c.plan as keyof typeof planPrices] || 0), 0)
        };

        console.log("🏢 SAAS COMPANIES - Statistiques:", calculatedStats);
        console.log("🏢 SAAS COMPANIES - Entreprises traitées:", enrichedCompanies.length);

        setCompanies(enrichedCompanies);
        setStats(calculatedStats);

      } catch (error) {
        console.error('❌ SAAS COMPANIES - Erreur:', error);
        setCompanies([]);
        setStats({ total: 0, active: 0, trial: 0, monthlyRevenue: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return { companies, stats, loading };
};