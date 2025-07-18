
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Zap, CheckCircle, AlertCircle, Clock, Globe, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface CompanyDomain {
  id: string;
  company_id: string;
  subdomain: string;
  is_active: boolean;
}

interface NetlifyDeployment {
  id: string;
  company_id: string;
  status: string;
}

interface ClientSetupStatus {
  company: Company;
  domain?: CompanyDomain;
  deployment?: NetlifyDeployment;
  setupComplete: boolean;
}

const UnifiedClientSetup = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clientStatuses, setClientStatuses] = useState<ClientSetupStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [setupRunning, setSetupRunning] = useState<Record<string, boolean>>({});
  const [newClientName, setNewClientName] = useState("");
  const [newClientRepo, setNewClientRepo] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Récupérer les entreprises
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Récupérer les domaines
      const { data: domainsData, error: domainsError } = await supabase
        .from('company_domains')
        .select('*');

      if (domainsError) throw domainsError;

      // Récupérer les déploiements
      const { data: deploymentsData, error: deploymentsError } = await supabase
        .from('netlify_deployments')
        .select('*');

      if (deploymentsError) throw deploymentsError;

      // Construire le statut de chaque client
      const statuses: ClientSetupStatus[] = (companiesData || []).map(company => {
        const domain = (domainsData || []).find(d => d.company_id === company.id);
        const deployment = (deploymentsData || []).find(d => d.company_id === company.id);
        
        return {
          company,
          domain,
          deployment,
          setupComplete: Boolean(domain?.is_active && deployment?.status === 'success')
        };
      });

      setClientStatuses(statuses);

    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast.error("Impossible de charger les données");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSetup = async (companyId: string, companyName: string, repositoryUrl?: string) => {
    setSetupRunning(prev => ({ ...prev, [companyId]: true }));
    toast.info(`🚀 Configuration complète pour ${companyName}...`);

    try {
      // Étape 1: Créer le domaine si nécessaire
      const status = clientStatuses.find(s => s.company.id === companyId);
      if (!status?.domain) {
        const cleanName = companyName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 20);

        const { error: domainError } = await supabase.functions.invoke('create-cloudflare-subdomain', {
          body: {
            companyId,
            companyName,
            subdomain: cleanName
          }
        });

        if (domainError) throw domainError;
        toast.success(`✅ Domaine créé: ${cleanName}.leazr.co`);
      }

      // Étape 2: Déployer sur Netlify si URL fournie
      if (repositoryUrl) {
        const { error: deployError } = await supabase.functions.invoke('deploy-to-netlify', {
          body: {
            companyId,
            repositoryUrl,
            buildCommand: "npm run build",
            publishDirectory: "dist",
            environmentVariables: {
              NODE_ENV: "production"
            }
          }
        });

        if (deployError) throw deployError;
        toast.success(`✅ Déploiement initié pour ${companyName}`);
      }

      toast.success(`🎉 Configuration complète pour ${companyName}`);
      fetchData();

    } catch (error) {
      console.error(`Erreur pour ${companyName}:`, error);
      toast.error(`Erreur lors de la configuration de ${companyName}`);
    } finally {
      setSetupRunning(prev => ({ ...prev, [companyId]: false }));
    }
  };

  const handleCreateNewClient = async () => {
    if (!newClientName) {
      toast.error("Veuillez saisir un nom d'entreprise");
      return;
    }

    setIsCreatingClient(true);
    toast.info("🏢 Création du nouveau client...");

    try {
      // Créer l'entreprise
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: newClientName,
          plan: 'starter'
        })
        .select()
        .single();

      if (companyError) throw companyError;

      toast.success(`✅ Client créé: ${newClientName}`);

      // Configuration automatique complète
      await handleCompleteSetup(companyData.id, newClientName, newClientRepo || undefined);

      setNewClientName("");
      setNewClientRepo("");

    } catch (error) {
      console.error("Erreur lors de la création:", error);
      toast.error("Erreur lors de la création du client");
    } finally {
      setIsCreatingClient(false);
    }
  };

  const getSetupProgress = (status: ClientSetupStatus) => {
    let progress = 0;
    let steps = 0;
    
    if (status.domain) {
      progress += status.domain.is_active ? 50 : 25;
    }
    if (status.deployment) {
      progress += status.deployment.status === 'success' ? 50 : 25;
    }
    
    return Math.min(progress, 100);
  };

  const getStatusIcon = (status: ClientSetupStatus) => {
    if (status.setupComplete) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (status.domain || status.deployment) {
      return <Clock className="h-4 w-4 text-orange-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
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

  const incompleteSetups = clientStatuses.filter(s => !s.setupComplete).length;
  const completeSetups = clientStatuses.filter(s => s.setupComplete).length;

  return (
    <div className="space-y-6">
      {/* Nouveau Client */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Nouveau Client
          </CardTitle>
          <CardDescription>
            Créez et configurez automatiquement un nouveau client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom de l'entreprise *</Label>
              <Input
                id="clientName"
                placeholder="Mon Entreprise"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientRepo">Repository GitHub (optionnel)</Label>
              <Input
                id="clientRepo"
                placeholder="https://github.com/user/repo"
                value={newClientRepo}
                onChange={(e) => setNewClientRepo(e.target.value)}
              />
            </div>
          </div>
          
          <Button
            onClick={handleCreateNewClient}
            disabled={isCreatingClient || !newClientName}
            className="gap-2"
          >
            {isCreatingClient ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Création...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Créer et Configurer
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
            <strong>Configuration automatique :</strong> Domaine *.leazr.co + Déploiement Netlify (si repository fourni)
          </div>
        </CardContent>
      </Card>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{clientStatuses.length}</p>
                <p className="text-xs text-muted-foreground">Clients totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{completeSetups}</p>
                <p className="text-xs text-muted-foreground">Configurations complètes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{incompleteSetups}</p>
                <p className="text-xs text-muted-foreground">À finaliser</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des clients */}
      <Card>
        <CardHeader>
          <CardTitle>Status des Clients</CardTitle>
          <CardDescription>
            Vue d'ensemble de la configuration de tous vos clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clientStatuses.map((status) => (
              <div key={status.company.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <div className="flex-1">
                    <p className="font-medium">{status.company.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {status.domain ? (
                          <span className={status.domain.is_active ? "text-green-600" : "text-orange-600"}>
                            {status.domain.subdomain}.leazr.co
                          </span>
                        ) : (
                          <span className="text-red-600">Aucun domaine</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Rocket className="h-3 w-3" />
                        {status.deployment ? (
                          <span className={status.deployment.status === 'success' ? "text-green-600" : "text-orange-600"}>
                            {status.deployment.status}
                          </span>
                        ) : (
                          <span className="text-red-600">Non déployé</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getSetupProgress(status)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">
                    {getSetupProgress(status)}%
                  </span>
                  
                  {!status.setupComplete && (
                    <Button
                      size="sm"
                      onClick={() => handleCompleteSetup(status.company.id, status.company.name)}
                      disabled={setupRunning[status.company.id]}
                      className="gap-1"
                    >
                      {setupRunning[status.company.id] ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Setup...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3" />
                          Finaliser
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {clientStatuses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun client configuré</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedClientSetup;
