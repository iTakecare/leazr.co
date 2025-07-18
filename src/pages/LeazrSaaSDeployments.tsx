import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/ui/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Rocket, 
  Settings, 
  Activity, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Globe,
  RefreshCw
} from "lucide-react";

interface DeploymentLog {
  id: string;
  site_name: string;
  status: string;
  deploy_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface NetlifyConfig {
  id: string;
  site_name: string;
  site_id: string | null;
  repository_url: string;
  build_command: string;
  publish_directory: string;
  is_active: boolean;
}

export default function LeazrSaaSDeployments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deployments, setDeployments] = useState<DeploymentLog[]>([]);
  const [config, setConfig] = useState<NetlifyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [configForm, setConfigForm] = useState({
    site_name: "",
    repository_url: "",
    build_command: "npm run build",
    publish_directory: "dist"
  });

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
      
      // Récupérer la configuration
      const { data: configData } = await supabase
        .from("netlify_configurations")
        .select("*")
        .eq("is_active", true)
        .single();
      
      if (configData) {
        setConfig(configData);
        setConfigForm({
          site_name: configData.site_name,
          repository_url: configData.repository_url,
          build_command: configData.build_command,
          publish_directory: configData.publish_directory
        });
      }

      // Récupérer les déploiements
      const { data: deploymentsData } = await supabase
        .from("netlify_deployments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (deploymentsData) {
        setDeployments(deploymentsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      const { error } = await supabase
        .from("netlify_configurations")
        .upsert({
          site_name: configForm.site_name,
          repository_url: configForm.repository_url,
          build_command: configForm.build_command,
          publish_directory: configForm.publish_directory,
          is_active: true
        });

      if (error) throw error;

      toast.success("Configuration sauvegardée avec succès");
      await fetchData();
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const startDeployment = async () => {
    if (!config) {
      toast.error("Veuillez d'abord configurer Netlify");
      return;
    }

    try {
      setDeploying(true);
      
      const { data, error } = await supabase.functions.invoke("deploy-to-netlify", {
        body: {
          site_name: config.site_name,
          repository_url: config.repository_url,
          build_command: config.build_command,
          publish_directory: config.publish_directory
        }
      });

      if (error) throw error;

      toast.success("Déploiement lancé avec succès");
      await fetchData();
    } catch (error) {
      console.error("Error starting deployment:", error);
      toast.error("Erreur lors du lancement du déploiement");
    } finally {
      setDeploying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "building":
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />En cours</Badge>;
      case "deployed":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Déployé</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Échec</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Inconnu</Badge>;
    }
  };

  if (!user || !isLeazrSaaSAdmin) return null;

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Déploiements Netlify</h1>
              <p className="text-muted-foreground">
                Gestion des déploiements automatisés sur Netlify
              </p>
            </div>
            <Badge variant="secondary" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              Admin SaaS
            </Badge>
          </div>

          <Tabs defaultValue="deployments" className="space-y-6">
            <TabsList>
              <TabsTrigger value="deployments">
                <Activity className="w-4 h-4 mr-2" />
                Déploiements
              </TabsTrigger>
              <TabsTrigger value="configuration">
                <Settings className="w-4 h-4 mr-2" />
                Configuration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deployments" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Déploiement rapide</CardTitle>
                      <CardDescription>
                        Lancez un nouveau déploiement vers Netlify
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={startDeployment} 
                      disabled={!config || deploying}
                      className="bg-gradient-to-r from-purple-600 to-blue-600"
                    >
                      {deploying ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Déploiement...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4 mr-2" />
                          Déployer maintenant
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {config && (
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Site:</span> {config.site_name}
                      </div>
                      <div>
                        <span className="font-medium">Repository:</span> {config.repository_url}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Historique des déploiements</CardTitle>
                    <Button variant="outline" onClick={fetchData}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Actualiser
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deployments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucun déploiement trouvé
                      </p>
                    ) : (
                      deployments.map((deployment) => (
                        <div
                          key={deployment.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium">{deployment.site_name}</h4>
                              {getStatusBadge(deployment.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Démarré le {new Date(deployment.created_at).toLocaleString("fr-FR")}
                              {deployment.completed_at && (
                                <> • Terminé le {new Date(deployment.completed_at).toLocaleString("fr-FR")}</>
                              )}
                            </p>
                            {deployment.error_message && (
                              <p className="text-sm text-destructive">
                                Erreur: {deployment.error_message}
                              </p>
                            )}
                          </div>
                          {deployment.deploy_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={deployment.deploy_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Voir le site
                              </a>
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="configuration" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Netlify</CardTitle>
                  <CardDescription>
                    Paramètres pour les déploiements automatisés
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="site_name">Nom du site</Label>
                      <Input
                        id="site_name"
                        value={configForm.site_name}
                        onChange={(e) => setConfigForm(prev => ({ ...prev, site_name: e.target.value }))}
                        placeholder="mon-site-leazr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repository_url">URL du repository</Label>
                      <Input
                        id="repository_url"
                        value={configForm.repository_url}
                        onChange={(e) => setConfigForm(prev => ({ ...prev, repository_url: e.target.value }))}
                        placeholder="https://github.com/user/repo"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="build_command">Commande de build</Label>
                      <Input
                        id="build_command"
                        value={configForm.build_command}
                        onChange={(e) => setConfigForm(prev => ({ ...prev, build_command: e.target.value }))}
                        placeholder="npm run build"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="publish_directory">Dossier de publication</Label>
                      <Input
                        id="publish_directory"
                        value={configForm.publish_directory}
                        onChange={(e) => setConfigForm(prev => ({ ...prev, publish_directory: e.target.value }))}
                        placeholder="dist"
                      />
                    </div>
                  </div>

                  <Button onClick={saveConfiguration} className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Sauvegarder la configuration
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
}