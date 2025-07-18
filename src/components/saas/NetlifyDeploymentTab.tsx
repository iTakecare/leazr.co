
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Key,
  Code,
  Server,
  ExternalLink,
  Zap,
  Building,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNetlifyConfig } from "@/hooks/useNetlifyConfig";

interface NetlifyConfig {
  api_token?: string;
  team_slug?: string;
  default_build_command?: string;
  default_publish_directory?: string;
  default_environment_variables?: Record<string, string>;
  auto_deploy?: boolean;
}

const NetlifyDeploymentTab = () => {
  const { config, loading, isConfigured, reload } = useNetlifyConfig();
  const [localConfig, setLocalConfig] = useState<NetlifyConfig>({
    default_build_command: 'npm run build',
    default_publish_directory: 'dist',
    default_environment_variables: {},
    auto_deploy: true,
    ...config
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [envVarInput, setEnvVarInput] = useState({ key: '', value: '' });
  
  // Client information state
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    repositoryUrl: '',
    siteName: ''
  });

  const [deploymentResult, setDeploymentResult] = useState<any>(null);

  React.useEffect(() => {
    if (config) {
      setLocalConfig(prev => ({ ...prev, ...config }));
      setConnectionStatus(config.api_token ? 'success' : 'unknown');
    }
  }, [config]);

  const saveNetlifyConfig = async () => {
    setIsLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Company ID not found');
      }

      const { error } = await supabase
        .from('company_integrations')
        .upsert({
          company_id: profile.company_id,
          integration_type: 'netlify',
          api_credentials: {
            api_token: localConfig.api_token
          },
          settings: {
            team_slug: localConfig.team_slug,
            default_build_command: localConfig.default_build_command,
            default_publish_directory: localConfig.default_publish_directory,
            default_environment_variables: localConfig.default_environment_variables,
            auto_deploy: localConfig.auto_deploy
          },
          is_enabled: !!localConfig.api_token
        }, {
          onConflict: 'company_id,integration_type'
        });

      if (error) throw error;
      
      toast.success("Configuration Netlify sauvegardée avec succès");
      reload();
    } catch (error: any) {
      console.error('Error saving Netlify config:', error);
      toast.error("Erreur lors de la sauvegarde : " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!localConfig.api_token) {
      toast.error("Veuillez d'abord saisir votre token API Netlify");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('https://api.netlify.com/api/v1/user', {
        headers: {
          'Authorization': `Bearer ${localConfig.api_token}`
        }
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast.success("Connexion Netlify réussie !");
      } else {
        setConnectionStatus('error');
        toast.error("Échec de la connexion Netlify. Vérifiez votre token.");
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error("Erreur lors du test de connexion");
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeployment = async () => {
    if (!isConfigured()) {
      toast.error("Configuration Netlify requise avant déploiement");
      return;
    }

    if (!clientInfo.repositoryUrl) {
      toast.error("URL du repository requis pour le déploiement");
      return;
    }

    setIsDeploying(true);
    try {
      console.log('🚀 Déploiement en cours vers Netlify...');
      
      const { data, error } = await supabase.functions.invoke('deploy-to-netlify', {
        body: {
          repositoryUrl: clientInfo.repositoryUrl,
          siteName: clientInfo.siteName || undefined,
          clientInfo: {
            name: clientInfo.name,
            email: clientInfo.email,
            company: clientInfo.company,
            phone: clientInfo.phone,
            address: clientInfo.address
          },
          environmentVariables: localConfig.default_environment_variables || {}
        }
      });

      if (error) {
        console.error('❌ Erreur de déploiement:', error);
        throw error;
      }

      console.log('✅ Déploiement réussi:', data);
      setDeploymentResult(data);
      toast.success("🎉 Déploiement Netlify réussi !");
      
    } catch (error: any) {
      console.error('❌ Erreur lors du déploiement:', error);
      toast.error(`Erreur de déploiement: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const addEnvironmentVariable = () => {
    if (envVarInput.key && envVarInput.value) {
      setLocalConfig(prev => ({
        ...prev,
        default_environment_variables: {
          ...prev.default_environment_variables,
          [envVarInput.key]: envVarInput.value
        }
      }));
      setEnvVarInput({ key: '', value: '' });
    }
  };

  const removeEnvironmentVariable = (key: string) => {
    setLocalConfig(prev => {
      const newEnvVars = { ...prev.default_environment_variables };
      delete newEnvVars[key];
      return {
        ...prev,
        default_environment_variables: newEnvVars
      };
    });
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connecté
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erreur
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Settings className="h-3 w-3 mr-1" />
            Non configuré
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>Statut de la connexion Netlify:</span>
            {getStatusBadge()}
          </div>
        </AlertDescription>
      </Alert>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Informations Client
          </CardTitle>
          <CardDescription>
            Informations du client pour le déploiement d'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom du client *</Label>
              <Input
                id="clientName"
                value={clientInfo.name}
                onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nom complet du client"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientCompany">Entreprise</Label>
              <Input
                id="clientCompany"
                value={clientInfo.company}
                onChange={(e) => setClientInfo(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Nom de l'entreprise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clientPhone"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+33 1 23 45 67 89"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientAddress">Adresse</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="clientAddress"
                value={clientInfo.address}
                onChange={(e) => setClientInfo(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Adresse complète du client"
                className="pl-10"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configuration API Netlify
          </CardTitle>
          <CardDescription>
            Configurez votre token API Netlify pour automatiser les déploiements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiToken">Token API Netlify *</Label>
            <div className="flex gap-2">
              <Input
                id="apiToken"
                type="password"
                value={localConfig.api_token || ''}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, api_token: e.target.value }))}
                placeholder="Collez votre token API Netlify ici"
                className="flex-1"
              />
              <Button 
                onClick={testConnection} 
                disabled={isTesting || !localConfig.api_token}
                variant="outline"
              >
                {isTesting ? "Test..." : "Tester"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Vous pouvez créer un token sur{" "}
              <a 
                href="https://app.netlify.com/user/applications#personal-access-tokens" 
                target="_blank" 
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Netlify Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamSlug">Équipe/Organisation (optionnel)</Label>
            <Input
              id="teamSlug"
              value={localConfig.team_slug || ''}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, team_slug: e.target.value }))}
              placeholder="nom-de-votre-equipe"
            />
          </div>
        </CardContent>
      </Card>

      {/* Repository Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Configuration Repository
          </CardTitle>
          <CardDescription>
            Configuration du code source pour le déploiement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repositoryUrl">URL du Repository *</Label>
            <Input
              id="repositoryUrl"
              value={clientInfo.repositoryUrl}
              onChange={(e) => setClientInfo(prev => ({ ...prev, repositoryUrl: e.target.value }))}
              placeholder="https://github.com/username/repository"
            />
            <p className="text-xs text-muted-foreground">
              Lien vers le repository GitHub, GitLab ou Bitbucket
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteName">Nom du site Netlify (optionnel)</Label>
            <Input
              id="siteName"
              value={clientInfo.siteName}
              onChange={(e) => setClientInfo(prev => ({ ...prev, siteName: e.target.value }))}
              placeholder="mon-site-client"
            />
            <p className="text-xs text-muted-foreground">
              Si vide, Netlify générera un nom automatiquement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buildCommand">Commande de build</Label>
              <Input
                id="buildCommand"
                value={localConfig.default_build_command || ''}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, default_build_command: e.target.value }))}
                placeholder="npm run build"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publishDir">Répertoire de publication</Label>
              <Input
                id="publishDir"
                value={localConfig.default_publish_directory || ''}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, default_publish_directory: e.target.value }))}
                placeholder="dist"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="autoDeploy"
              checked={localConfig.auto_deploy}
              onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, auto_deploy: checked }))}
            />
            <Label htmlFor="autoDeploy">Déploiement automatique après push</Label>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Variables d'environnement
          </CardTitle>
          <CardDescription>
            Variables appliquées par défaut au déploiement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Clé"
              value={envVarInput.key}
              onChange={(e) => setEnvVarInput(prev => ({ ...prev, key: e.target.value }))}
            />
            <Input
              placeholder="Valeur"
              value={envVarInput.value}
              onChange={(e) => setEnvVarInput(prev => ({ ...prev, value: e.target.value }))}
            />
            <Button onClick={addEnvironmentVariable} disabled={!envVarInput.key || !envVarInput.value}>
              Ajouter
            </Button>
          </div>

          {Object.keys(localConfig.default_environment_variables || {}).length > 0 && (
            <div className="space-y-2">
              <Label>Variables configurées:</Label>
              <div className="space-y-1">
                {Object.entries(localConfig.default_environment_variables || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-mono text-sm">
                      <strong>{key}</strong> = {value}
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => removeEnvironmentVariable(key)}
                    >
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment Results */}
      {deploymentResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Résultat du Déploiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Site URL:</strong> 
                <a href={deploymentResult.site_url} target="_blank" className="text-blue-600 hover:underline ml-2 inline-flex items-center gap-1">
                  {deploymentResult.site_url} <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <p><strong>Admin URL:</strong> 
                <a href={deploymentResult.admin_url} target="_blank" className="text-blue-600 hover:underline ml-2 inline-flex items-center gap-1">
                  Panneau Admin <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <p><strong>Deploy ID:</strong> <code>{deploymentResult.deploy_id}</code></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <Button onClick={saveNetlifyConfig} disabled={isLoading} variant="outline">
          {isLoading ? "Sauvegarde..." : "Sauvegarder la configuration"}
        </Button>
        
        <Button 
          onClick={handleDeployment} 
          disabled={isDeploying || !isConfigured() || !clientInfo.repositoryUrl}
          className="gap-2"
        >
          {isDeploying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Déploiement...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Déployer l'Application
            </>
          )}
        </Button>

        <Button variant="outline" asChild>
          <a 
            href="https://supabase.com/dashboard/project/cifbetjefyfocafanlhv/functions/deploy-to-netlify/logs" 
            target="_blank"
            className="inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Voir les Logs
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NetlifyDeploymentTab;
