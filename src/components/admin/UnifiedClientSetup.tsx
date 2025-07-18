
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Globe, 
  Rocket, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Settings,
  Activity,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Client {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'pending' | 'error';
  domainConfigured: boolean;
  lastDeployment?: string;
}

interface NetlifyConfig {
  repository_url: string;
  build_command: string;
  publish_directory: string;
}

const UnifiedClientSetup = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("create");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [isNetlifyConfigured, setIsNetlifyConfigured] = useState(false);
  const [netlifyConfig, setNetlifyConfig] = useState<NetlifyConfig | null>(null);
  
  // Form state
  const [clientName, setClientName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  
  // Mock data - in reality this would come from your database
  const [clients, setClients] = useState<Client[]>([
    {
      id: "1",
      name: "ITakeCare Demo",
      subdomain: "itakecare",
      status: 'active',
      domainConfigured: true,
      lastDeployment: "2024-01-15T10:30:00Z"
    },
    {
      id: "2", 
      name: "TechCorp Solutions",
      subdomain: "techcorp",
      status: 'pending',
      domainConfigured: false
    }
  ]);

  useEffect(() => {
    checkNetlifyConfiguration();
  }, []);

  const checkNetlifyConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('netlify_configurations')
        .select('repository_url, build_command, publish_directory')
        .limit(1)
        .single();

      if (data && !error) {
        setIsNetlifyConfigured(true);
        setNetlifyConfig(data);
      } else {
        setIsNetlifyConfigured(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la configuration Netlify:', error);
      setIsNetlifyConfigured(false);
    }
  };

  const handleCreateClient = async () => {
    if (!clientName || !subdomain) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    setIsCreating(true);
    
    try {
      // Simulate API call to create client
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add new client to the list
      const newClient: Client = {
        id: Date.now().toString(),
        name: clientName,
        subdomain: subdomain,
        status: 'pending',
        domainConfigured: false
      };
      
      setClients([...clients, newClient]);
      setClientName("");
      setSubdomain("");
      
      toast.success(`Client ${clientName} créé avec succès`);
      
      // Auto-configure domain after creation
      await handleConfigureDomain(newClient.id);
      
    } catch (error) {
      toast.error("Erreur lors de la création du client");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfigureDomain = async (clientId: string) => {
    try {
      // Simulate domain configuration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, domainConfigured: true, status: 'active' as const }
          : client
      ));
      
      toast.success("Domaine configuré automatiquement");
    } catch (error) {
      toast.error("Erreur lors de la configuration du domaine");
    }
  };

  const handleGlobalDeploy = async () => {
    if (!isNetlifyConfigured) {
      toast.error("Configuration Netlify requise", {
        description: "Veuillez d'abord configurer Netlify dans les paramètres",
        action: {
          label: "Configurer",
          onClick: () => navigate("/admin/leazr-saas-configuration")
        }
      });
      return;
    }

    setIsDeploying(true);
    setDeployProgress(0);

    try {
      // Appeler l'edge function deploy-to-netlify pour chaque client
      const deploymentPromises = clients.map(async (client) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Session non trouvée');

        const { data, error } = await supabase.functions.invoke('deploy-to-netlify', {
          body: {
            companyId: client.id,
            repositoryUrl: netlifyConfig?.repository_url,
            siteName: `leazr-${client.subdomain}`,
            buildCommand: netlifyConfig?.build_command || 'npm run build',
            publishDirectory: netlifyConfig?.publish_directory || 'dist',
            autoDeploy: true,
            environmentVariables: {
              VITE_COMPANY_SUBDOMAIN: client.subdomain
            }
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;
        return data;
      });

      // Simuler le progrès du déploiement
      const intervals = [20, 40, 60, 80, 100];
      for (let i = 0; i < intervals.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDeployProgress(intervals[i]);
      }

      // Attendre tous les déploiements
      await Promise.all(deploymentPromises);
      
      // Update all clients' last deployment
      const now = new Date().toISOString();
      setClients(prev => prev.map(client => ({
        ...client,
        lastDeployment: now
      })));
      
      toast.success("Application déployée pour tous les clients");
    } catch (error) {
      console.error('Erreur de déploiement:', error);
      toast.error("Erreur lors du déploiement", {
        description: error.message || "Vérifiez la configuration Netlify"
      });
    } finally {
      setIsDeploying(false);
      setDeployProgress(0);
    }
  };

  const getStatusBadge = (status: Client['status']) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En cours</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Erreur</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Actions */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Actions Globales</h3>
          <p className="text-sm text-gray-600">
            Déployez l'application mise à jour pour tous vos clients
          </p>
          {!isNetlifyConfigured && (
            <div className="flex items-center gap-2 mt-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-600">Configuration Netlify requise</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {!isNetlifyConfigured && (
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/leazr-saas-configuration")}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurer Netlify
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
          <Button 
            onClick={handleGlobalDeploy}
            disabled={isDeploying || !isNetlifyConfigured}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            <Rocket className="h-4 w-4 mr-2" />
            {isDeploying ? "Déploiement..." : "Déployer l'Application"}
          </Button>
        </div>
      </div>

      {/* Deployment Progress */}
      {isDeploying && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>Déploiement en cours sur Netlify...</p>
              <Progress value={deployProgress} className="w-full" />
              <p className="text-xs text-gray-500">{deployProgress}% terminé</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Nouveau Client</TabsTrigger>
          <TabsTrigger value="manage">Gestion Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Créer un Nouveau Client
              </CardTitle>
              <CardDescription>
                Configuration automatisée : création du client + configuration du domaine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du Client</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: ITakeCare Solutions"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">Sous-domaine</Label>
                  <div className="flex">
                    <Input
                      id="subdomain"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="Ex: itakecare"
                      className="rounded-r-none"
                    />
                    <div className="bg-gray-50 border border-l-0 rounded-r-md px-3 py-2 text-sm text-gray-500">
                      .leazr.co
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateClient}
                disabled={isCreating || !clientName || !subdomain}
                className="w-full"
              >
                {isCreating ? "Création en cours..." : "Créer et Configurer"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clients Existants
              </CardTitle>
              <CardDescription>
                Gérez vos clients et leurs configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{client.name}</h3>
                        {getStatusBadge(client.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          <span>{client.subdomain}.leazr.co</span>
                        </div>
                        {client.domainConfigured && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Domaine configuré</span>
                          </div>
                        )}
                        {client.lastDeployment && (
                          <div className="flex items-center gap-1">
                            <Rocket className="h-4 w-4" />
                            <span>Déployé le {new Date(client.lastDeployment).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!client.domainConfigured && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConfigureDomain(client.id)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configurer
                        </Button>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <a href={`https://${client.subdomain}.leazr.co`} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-1" />
                          Voir le site
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
                
                {clients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun client configuré</p>
                    <p className="text-sm">Créez votre premier client dans l'onglet "Nouveau Client"</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedClientSetup;
