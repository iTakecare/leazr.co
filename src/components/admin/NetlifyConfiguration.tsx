
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  GitBranch, 
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  Key
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NetlifyConfig {
  id?: string;
  repository_url: string;
  netlify_access_token: string;
  build_command: string;
  publish_directory: string;
  site_name: string;
  auto_deploy: boolean;
}

const NetlifyConfiguration = () => {
  const [config, setConfig] = useState<NetlifyConfig>({
    repository_url: "",
    netlify_access_token: "",
    build_command: "npm run build",
    publish_directory: "dist",
    site_name: "leazr-main",
    auto_deploy: true
  });
  
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      // Pour l'admin SaaS, on cherche une configuration globale
      const { data, error } = await supabase
        .from('netlify_configurations')
        .select('*')
        .limit(1)
        .single();

      if (data && !error) {
        setConfig({
          id: data.id,
          repository_url: data.repository_url || "",
          netlify_access_token: "", // Ne jamais afficher le token pour la sécurité
          build_command: data.build_command || "npm run build",
          publish_directory: data.publish_directory || "dist",
          site_name: data.site_name || "leazr-main",
          auto_deploy: data.auto_deploy || false
        });
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.repository_url || !config.netlify_access_token) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSaving(true);
    try {
      const configData = {
        company_id: null, // Configuration globale pour l'admin SaaS
        repository_url: config.repository_url,
        netlify_access_token: config.netlify_access_token,
        build_command: config.build_command,
        publish_directory: config.publish_directory,
        site_name: config.site_name,
        auto_deploy: config.auto_deploy
      };

      if (config.id) {
        // Mise à jour
        const { error } = await supabase
          .from('netlify_configurations')
          .update(configData)
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        // Création
        const { data, error } = await supabase
          .from('netlify_configurations')
          .insert(configData)
          .select()
          .single();
        
        if (error) throw error;
        setConfig(prev => ({ ...prev, id: data.id }));
      }

      setIsConfigured(true);
      toast.success("Configuration Netlify sauvegardée avec succès");
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error("Erreur lors de la sauvegarde de la configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof NetlifyConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuration Netlify</h2>
          <p className="text-muted-foreground">
            Configurez le déploiement automatique de votre application Leazr
          </p>
        </div>
        <Badge variant={isConfigured ? "default" : "secondary"}>
          {isConfigured ? (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Configuré
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 mr-1" />
              Non configuré
            </>
          )}
        </Badge>
      </div>

      {!isConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous devez configurer Netlify avant de pouvoir déployer l'application pour vos clients.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Configuration du Repository
          </CardTitle>
          <CardDescription>
            Informations sur votre dépôt Git contenant l'application Leazr
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repository_url">URL du Repository Git *</Label>
            <Input
              id="repository_url"
              type="url"
              placeholder="https://github.com/votre-org/leazr-app"
              value={config.repository_url}
              onChange={(e) => handleInputChange('repository_url', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              URL complète de votre repository GitHub contenant l'application Leazr
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuration Netlify
          </CardTitle>
          <CardDescription>
            Paramètres de déploiement sur Netlify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="netlify_access_token">Token d'accès Netlify *</Label>
            <Input
              id="netlify_access_token"
              type="password"
              placeholder="Votre token d'accès Netlify"
              value={config.netlify_access_token}
              onChange={(e) => handleInputChange('netlify_access_token', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              <Key className="h-3 w-3 inline mr-1" />
              Obtenez votre token sur{" "}
              <a 
                href="https://app.netlify.com/user/applications#personal-access-tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Netlify
              </a>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site_name">Nom du site</Label>
              <Input
                id="site_name"
                placeholder="leazr-main"
                value={config.site_name}
                onChange={(e) => handleInputChange('site_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="build_command">Commande de build</Label>
              <Input
                id="build_command"
                placeholder="npm run build"
                value={config.build_command}
                onChange={(e) => handleInputChange('build_command', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publish_directory">Répertoire de publication</Label>
            <Input
              id="publish_directory"
              placeholder="dist"
              value={config.publish_directory}
              onChange={(e) => handleInputChange('publish_directory', e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto_deploy"
              checked={config.auto_deploy}
              onCheckedChange={(checked) => handleInputChange('auto_deploy', checked)}
            />
            <Label htmlFor="auto_deploy">Déploiement automatique</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Sauvegarde..." : "Sauvegarder la configuration"}
        </Button>
      </div>
    </div>
  );
};

export default NetlifyConfiguration;
