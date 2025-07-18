
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Globe, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Key,
  Code,
  Server
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NetlifyConfig {
  api_token?: string;
  team_slug?: string;
  default_build_command?: string;
  default_publish_directory?: string;
  default_environment_variables?: Record<string, string>;
  auto_deploy?: boolean;
}

const NetlifyConfigurationTab = () => {
  const [config, setConfig] = useState<NetlifyConfig>({
    default_build_command: 'npm run build',
    default_publish_directory: 'dist',
    default_environment_variables: {},
    auto_deploy: true
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [envVarInput, setEnvVarInput] = useState({ key: '', value: '' });

  useEffect(() => {
    loadNetlifyConfig();
  }, []);

  const loadNetlifyConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('company_integrations')
        .select('*')
        .eq('integration_type', 'netlify')
        .single();

      if (data && !error) {
        setConfig({
          api_token: data.api_credentials?.api_token,
          team_slug: data.settings?.team_slug,
          default_build_command: data.settings?.default_build_command || 'npm run build',
          default_publish_directory: data.settings?.default_publish_directory || 'dist',
          default_environment_variables: data.settings?.default_environment_variables || {},
          auto_deploy: data.settings?.auto_deploy !== false
        });
        setConnectionStatus(data.api_credentials?.api_token ? 'success' : 'unknown');
      }
    } catch (error) {
      console.error('Error loading Netlify config:', error);
    }
  };

  const saveNetlifyConfig = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('company_integrations')
        .upsert({
          integration_type: 'netlify',
          api_credentials: {
            api_token: config.api_token
          },
          settings: {
            team_slug: config.team_slug,
            default_build_command: config.default_build_command,
            default_publish_directory: config.default_publish_directory,
            default_environment_variables: config.default_environment_variables,
            auto_deploy: config.auto_deploy
          },
          is_enabled: !!config.api_token
        }, {
          onConflict: 'company_id,integration_type'
        });

      if (error) throw error;
      
      toast.success("Configuration Netlify sauvegardée avec succès");
    } catch (error: any) {
      console.error('Error saving Netlify config:', error);
      toast.error("Erreur lors de la sauvegarde : " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!config.api_token) {
      toast.error("Veuillez d'abord saisir votre token API Netlify");
      return;
    }

    setIsTesting(true);
    try {
      // Test the connection by trying to fetch user info
      const response = await fetch('https://api.netlify.com/api/v1/user', {
        headers: {
          'Authorization': `Bearer ${config.api_token}`
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

  const addEnvironmentVariable = () => {
    if (envVarInput.key && envVarInput.value) {
      setConfig(prev => ({
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
    setConfig(prev => {
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

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configuration API
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
                value={config.api_token || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, api_token: e.target.value }))}
                placeholder="Collez votre token API Netlify ici"
                className="flex-1"
              />
              <Button 
                onClick={testConnection} 
                disabled={isTesting || !config.api_token}
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
                className="text-blue-600 hover:underline"
              >
                Netlify Dashboard
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamSlug">Équipe/Organisation (optionnel)</Label>
            <Input
              id="teamSlug"
              value={config.team_slug || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, team_slug: e.target.value }))}
              placeholder="nom-de-votre-equipe"
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour utiliser votre compte personnel
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Build Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Configuration de Build
          </CardTitle>
          <CardDescription>
            Paramètres par défaut pour les nouveaux sites Netlify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buildCommand">Commande de build</Label>
              <Input
                id="buildCommand"
                value={config.default_build_command || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, default_build_command: e.target.value }))}
                placeholder="npm run build"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publishDir">Répertoire de publication</Label>
              <Input
                id="publishDir"
                value={config.default_publish_directory || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, default_publish_directory: e.target.value }))}
                placeholder="dist"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="autoDeploy"
              checked={config.auto_deploy}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_deploy: checked }))}
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
            Variables appliquées par défaut à tous les nouveaux sites
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

          {Object.keys(config.default_environment_variables || {}).length > 0 && (
            <div className="space-y-2">
              <Label>Variables configurées:</Label>
              <div className="space-y-1">
                {Object.entries(config.default_environment_variables || {}).map(([key, value]) => (
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveNetlifyConfig} disabled={isLoading}>
          {isLoading ? "Sauvegarde..." : "Sauvegarder la configuration"}
        </Button>
      </div>
    </div>
  );
};

export default NetlifyConfigurationTab;
