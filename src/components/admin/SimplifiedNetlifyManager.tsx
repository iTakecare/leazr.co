
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Rocket, Github, Globe, CheckCircle, AlertCircle, Clock, Settings, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
}

interface NetlifyConfiguration {
  id: string;
  company_id: string;
  site_name: string;
  repository_url: string;
  build_command: string;
  publish_directory: string;
  environment_variables?: any;
  created_at: string;
  company?: Company;
}

interface NetlifyDeployment {
  id: string;
  company_id: string;
  site_id: string;
  deploy_id: string;
  status: string;
  deploy_url: string;
  created_at: string;
  company?: Company;
}

const SimplifiedNetlifyManager = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [configurations, setConfigurations] = useState<NetlifyConfiguration[]>([]);
  const [deployments, setDeployments] = useState<NetlifyDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isExpressDeploying, setIsExpressDeploying] = useState(false);

  // Formulaire simplifié
  const [selectedCompany, setSelectedCompany] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);

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

      // Récupérer les configurations
      const { data: configurationsData, error: configurationsError } = await supabase
        .from('netlify_configurations')
        .select(`
          *,
          company:companies(id, name)
        `)
        .order('created_at', { ascending: false });

      if (configurationsError) throw configurationsError;
      setConfigurations(configurationsData || []);

      // Récupérer les déploiements
      const { data: deploymentsData, error: deploymentsError } = await supabase
        .from('netlify_deployments')
        .select(`
          *,
          company:companies(id, name)
        `)
        .order('created_at', { ascending: false });

      if (deploymentsError) throw deploymentsError;
      setDeployments(deploymentsData || []);

    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast.error("Impossible de charger les données");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpressDeploy = async () => {
    if (!selectedCompany || !repositoryUrl) {
      toast.error("Veuillez sélectionner une entreprise et une URL de repository");
      return;
    }

    setIsDeploying(true);
    toast.info("🚀 Déploiement express en cours...");

    try {
      const { data, error } = await supabase.functions.invoke('deploy-to-netlify', {
        body: {
          companyId: selectedCompany,
          repositoryUrl,
          // Paramètres par défaut pour le déploiement express
          buildCommand: "npm run build",
          publishDirectory: "dist",
          environmentVariables: {
            NODE_ENV: "production"
          }
        }
      });

      if (error) throw error;

      toast.success("✅ Déploiement initié avec succès");
      setSelectedCompany("");
      setRepositoryUrl("");
      fetchData();

    } catch (error) {
      console.error("Erreur lors du déploiement:", error);
      toast.error("Erreur lors du déploiement");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAutoDeployAll = async () => {
    setIsExpressDeploying(true);
    toast.info("🚀 Déploiement automatique de tous les sites...");

    try {
      let deployedCount = 0;
      
      for (const config of configurations) {
        try {
          const { data, error } = await supabase.functions.invoke('deploy-to-netlify', {
            body: {
              companyId: config.company_id,
              repositoryUrl: config.repository_url,
              buildCommand: config.build_command,
              publishDirectory: config.publish_directory,
              environmentVariables: config.environment_variables
            }
          });

          if (!error) {
            deployedCount++;
            toast.success(`✅ Déployé: ${config.company?.name}`);
          }
        } catch (error) {
          console.error(`Erreur pour ${config.company?.name}:`, error);
        }
      }

      if (deployedCount > 0) {
        toast.success(`🎉 ${deployedCount} sites redéployés`);
        fetchData();
      }

    } catch (error) {
      console.error("Erreur lors du déploiement automatique:", error);
      toast.error("Erreur lors du déploiement automatique");
    } finally {
      setIsExpressDeploying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="h-3 w-3" />Déployé</Badge>;
      case 'building':
        return <Badge className="bg-blue-100 text-blue-800 gap-1"><Clock className="h-3 w-3" />En cours</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Échec</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />En attente</Badge>;
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

  return (
    <div className="space-y-6">
      {/* Déploiement Express */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Déploiement Express
          </CardTitle>
          <CardDescription>
            Déployez rapidement un nouveau site avec les paramètres optimisés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Entreprise</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repository">URL du Repository</Label>
              <Input
                id="repository"
                placeholder="https://github.com/user/repo"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleExpressDeploy}
              disabled={isDeploying || !selectedCompany || !repositoryUrl}
              className="gap-2"
            >
              {isDeploying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Déploiement...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Déployer Maintenant
                </>
              )}
            </Button>

            {configurations.length > 0 && (
              <Button
                variant="outline"
                onClick={handleAutoDeployAll}
                disabled={isExpressDeploying}
                className="gap-2"
              >
                {isExpressDeploying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Redéploiement...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Redéployer Tout
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
            <strong>Paramètres automatiques :</strong> Build command: npm run build, Directory: dist, Node.js optimisé
          </div>
        </CardContent>
      </Card>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{configurations.length}</p>
                <p className="text-xs text-muted-foreground">Sites configurés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{deployments.filter(d => d.status === 'success').length}</p>
                <p className="text-xs text-muted-foreground">Déploiements réussis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{deployments.filter(d => d.status === 'building').length}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des déploiements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sites Déployés</CardTitle>
            <CardDescription>
              Status des déploiements et configurations
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {showAdvanced ? 'Vue Simple' : 'Détails Techniques'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deployments.map((deployment) => (
              <div key={deployment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {deployment.company?.name || 'Entreprise inconnue'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {deployment.deploy_url}
                    </p>
                    {showAdvanced && (
                      <p className="text-xs text-muted-foreground">
                        Deploy ID: {deployment.deploy_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(deployment.status)}
                  {showAdvanced && (
                    <Button variant="outline" size="sm">
                      Voir Logs
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {deployments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Rocket className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun déploiement effectué</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimplifiedNetlifyManager;
