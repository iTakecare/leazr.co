import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Rocket, 
  Globe, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ExternalLink,
  Monitor,
  RefreshCw
} from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";

interface NetlifyDeployment {
  id: string;
  company_id: string;
  site_id: string;
  site_name: string;
  deploy_id: string;
  status: string;
  deploy_url: string;
  admin_url: string;
  site_url: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

interface NetlifyConfiguration {
  id: string;
  company_id: string;
  site_id: string;
  site_name: string;
  custom_domain: string;
  auto_deploy: boolean;
  build_command: string;
  publish_directory: string;
  environment_variables: Record<string, string>;
}

interface Company {
  id: string;
  name: string;
  custom_domain: string;
}

const LeazrSaaSDeployments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deployments, setDeployments] = useState<NetlifyDeployment[]>([]);
  const [configurations, setConfigurations] = useState<NetlifyConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);
  
  // Formulaire de déploiement
  const [selectedCompany, setSelectedCompany] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("https://github.com/your-repo/leazr-app");
  const [siteName, setSiteName] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [autoDeploy, setAutoDeploy] = useState(false);
  const [buildCommand, setBuildCommand] = useState("npm run build");
  const [publishDirectory, setPublishDirectory] = useState("dist");

  // Vérifier si l'utilisateur est l'admin SaaS Leazr
  const isLeazrSaaSAdmin = user?.email === "ecommerce@itakecare.be";

  useEffect(() => {
    if (!user || !isLeazrSaaSAdmin) {
      navigate("/dashboard");
      return;
    }

    fetchData();
  }, [user, isLeazrSaaSAdmin, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Récupérer les entreprises
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, custom_domain')
        .order('name');

      if (companiesError) throw companiesError;

      // Récupérer les déploiements
      const { data: deploymentsData, error: deploymentsError } = await supabase
        .from('netlify_deployments')
        .select('*')
        .order('created_at', { ascending: false });

      if (deploymentsError) throw deploymentsError;

      // Récupérer les configurations
      const { data: configurationsData, error: configurationsError } = await supabase
        .from('netlify_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (configurationsError) throw configurationsError;

      setCompanies(companiesData || []);
      setDeployments(deploymentsData || []);
      setConfigurations(configurationsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedCompany || !repositoryUrl) {
      toast.error('Veuillez sélectionner une entreprise et saisir l\'URL du repository');
      return;
    }

    try {
      setDeploying(selectedCompany);

      const { data, error } = await supabase.functions.invoke('deploy-to-netlify', {
        body: {
          companyId: selectedCompany,
          repositoryUrl,
          siteName: siteName || undefined,
          customDomain: customDomain || undefined,
          autoDeploy,
          buildCommand,
          publishDirectory,
          environmentVariables: {}
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Déploiement lancé avec succès!');
        fetchData(); // Rafraîchir les données
        
        // Réinitialiser le formulaire
        setSelectedCompany("");
        setSiteName("");
        setCustomDomain("");
        setAutoDeploy(false);
      } else {
        throw new Error(data.error || 'Erreur lors du déploiement');
      }

    } catch (error) {
      console.error('Deployment error:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setDeploying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      building: { color: "bg-blue-100 text-blue-800", icon: RefreshCw },
      ready: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      failed: { color: "bg-red-100 text-red-800", icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (!user || !isLeazrSaaSAdmin) return null;

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Déploiements Netlify</h1>
              <p className="text-muted-foreground">
                Gérez les déploiements automatisés des applications clients sur Netlify
              </p>
            </div>
            <Button onClick={fetchData} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulaire de déploiement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Nouveau déploiement
                </CardTitle>
                <CardDescription>
                  Déployez une application pour un client spécifique
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="company">Entreprise cliente</Label>
                  <select
                    id="company"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sélectionner une entreprise</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="repositoryUrl">URL du repository</Label>
                  <Input
                    id="repositoryUrl"
                    value={repositoryUrl}
                    onChange={(e) => setRepositoryUrl(e.target.value)}
                    placeholder="https://github.com/your-org/repo"
                  />
                </div>

                <div>
                  <Label htmlFor="siteName">Nom du site (optionnel)</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Laissez vide pour génération automatique"
                  />
                </div>

                <div>
                  <Label htmlFor="customDomain">Domaine personnalisé (optionnel)</Label>
                  <Input
                    id="customDomain"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="buildCommand">Commande de build</Label>
                    <Input
                      id="buildCommand"
                      value={buildCommand}
                      onChange={(e) => setBuildCommand(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="publishDirectory">Dossier de publication</Label>
                    <Input
                      id="publishDirectory"
                      value={publishDirectory}
                      onChange={(e) => setPublishDirectory(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoDeploy"
                    checked={autoDeploy}
                    onCheckedChange={setAutoDeploy}
                  />
                  <Label htmlFor="autoDeploy">Déploiement automatique</Label>
                </div>

                <Button 
                  onClick={handleDeploy}
                  disabled={!selectedCompany || !repositoryUrl || !!deploying}
                  className="w-full"
                >
                  {deploying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Déploiement en cours...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Lancer le déploiement
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Statistiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {deployments.length}
                    </div>
                    <div className="text-sm text-blue-600">Total déploiements</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {deployments.filter(d => d.status === 'ready').length}
                    </div>
                    <div className="text-sm text-green-600">Déploiements actifs</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {deployments.filter(d => d.status === 'building').length}
                    </div>
                    <div className="text-sm text-yellow-600">En cours</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {deployments.filter(d => d.status === 'failed').length}
                    </div>
                    <div className="text-sm text-red-600">Échecs</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des déploiements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Historique des déploiements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deployments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun déploiement trouvé
                  </div>
                ) : (
                  deployments.map((deployment) => {
                    const company = companies.find(c => c.id === deployment.company_id);
                    
                    return (
                      <div key={deployment.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">
                              {company?.name || 'Entreprise inconnue'}
                            </h3>
                            {getStatusBadge(deployment.status)}
                          </div>
                          <div className="flex items-center gap-2">
                            {deployment.site_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(deployment.site_url, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Voir le site
                              </Button>
                            )}
                            {deployment.admin_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(deployment.admin_url, '_blank')}
                              >
                                <Settings className="w-4 h-4 mr-1" />
                                Admin Netlify
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Site:</span> {deployment.site_name || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Déploiement:</span> {deployment.deploy_id || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Créé:</span> {new Date(deployment.created_at).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Mis à jour:</span> {new Date(deployment.updated_at).toLocaleDateString()}
                          </div>
                        </div>

                        {deployment.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                            <span className="font-medium">Erreur:</span> {deployment.error_message}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default LeazrSaaSDeployments;