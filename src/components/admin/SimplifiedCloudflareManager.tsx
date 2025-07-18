
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Globe, Zap, CheckCircle, AlertCircle, Clock, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
}

interface CompanyDomain {
  id: string;
  company_id: string;
  domain: string;
  subdomain: string;
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
  company?: Company;
}

interface CloudflareLog {
  id: string;
  company_id: string;
  subdomain: string;
  status: string;
  error_message?: string;
  created_at: string;
}

const SimplifiedCloudflareManager = () => {
  const [domains, setDomains] = useState<CompanyDomain[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [logs, setLogs] = useState<CloudflareLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoSetupRunning, setIsAutoSetupRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Récupérer les entreprises
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Récupérer les domaines avec les entreprises
      const { data: domainsData, error: domainsError } = await supabase
        .from('company_domains')
        .select(`
          *,
          company:companies(id, name)
        `)
        .order('created_at', { ascending: false });

      if (domainsError) throw domainsError;
      setDomains(domainsData || []);

      // Récupérer les logs récents
      const { data: logsData, error: logsError } = await supabase
        .from('cloudflare_subdomain_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;
      setLogs(logsData || []);

    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast.error("Impossible de charger les données");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSetup = async () => {
    setIsAutoSetupRunning(true);
    toast.info("🚀 Configuration automatique en cours...");

    try {
      // Trouver les entreprises sans domaine
      const companiesWithoutDomains = companies.filter(company => 
        !domains.some(domain => domain.company_id === company.id)
      );

      let processedCount = 0;
      for (const company of companiesWithoutDomains) {
        try {
          // Générer un sous-domaine automatiquement
          const cleanName = company.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20);

          const { data, error } = await supabase.functions.invoke('create-cloudflare-subdomain', {
            body: {
              companyId: company.id,
              companyName: company.name,
              subdomain: cleanName
            }
          });

          if (error) {
            console.error(`Erreur pour ${company.name}:`, error);
            continue;
          }

          processedCount++;
          toast.success(`✅ Domaine créé pour ${company.name}`);
        } catch (error) {
          console.error(`Erreur pour ${company.name}:`, error);
        }
      }

      if (processedCount > 0) {
        toast.success(`🎉 ${processedCount} domaines configurés automatiquement`);
        fetchData(); // Recharger les données
      } else {
        toast.info("Tous les domaines sont déjà configurés");
      }

    } catch (error) {
      console.error("Erreur lors de la configuration automatique:", error);
      toast.error("Erreur lors de la configuration automatique");
    } finally {
      setIsAutoSetupRunning(false);
    }
  };

  const getStatusBadge = (domain: CompanyDomain) => {
    if (domain.is_active) {
      return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="h-3 w-3" />Actif</Badge>;
    } else {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />En cours</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const companiesWithoutDomains = companies.filter(company => 
    !domains.some(domain => domain.company_id === company.id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Actions Principales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Configuration Automatique
          </CardTitle>
          <CardDescription>
            Configurez automatiquement les domaines pour tous vos clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {companiesWithoutDomains} entreprise{companiesWithoutDomains !== 1 ? 's' : ''} sans domaine
              </p>
              <p className="text-xs text-muted-foreground">
                Création automatique de sous-domaines *.leazr.co
              </p>
            </div>
            <Button
              onClick={handleAutoSetup}
              disabled={isAutoSetupRunning || companiesWithoutDomains === 0}
              className="gap-2"
            >
              {isAutoSetupRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Configuration...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Tout Configurer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vue d'ensemble simplifiée */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{domains.length}</p>
                <p className="text-xs text-muted-foreground">Domaines totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{domains.filter(d => d.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Domaines actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{companiesWithoutDomains}</p>
                <p className="text-xs text-muted-foreground">À configurer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des domaines simplifiée */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Domaines Configurés</CardTitle>
            <CardDescription>
              Liste des sous-domaines actifs pour vos clients
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {showAdvanced ? 'Vue Simple' : 'Options Avancées'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {domains.map((domain) => (
              <div key={domain.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {domain.subdomain}.{domain.domain}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {domain.company?.name || 'Entreprise inconnue'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(domain)}
                  {showAdvanced && (
                    <Button variant="outline" size="sm">
                      Configurer
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {domains.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun domaine configuré</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs récents (uniquement en mode avancé) */}
      {showAdvanced && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>
              Historique des dernières opérations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      log.status === 'success' ? 'bg-green-500' : 
                      log.status === 'failed' ? 'bg-red-500' : 'bg-orange-500'
                    }`} />
                    <span>{log.subdomain}.leazr.co</span>
                  </div>
                  <span className={getStatusColor(log.status)}>{log.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimplifiedCloudflareManager;
