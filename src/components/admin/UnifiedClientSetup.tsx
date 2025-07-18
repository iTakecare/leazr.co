
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNetlifyConfig } from "@/hooks/useNetlifyConfig";
import { 
  Building2, 
  Globe, 
  Rocket, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Settings,
  Database,
  Cloud
} from "lucide-react";

const UnifiedClientSetup = () => {
  const { config: netlifyConfig, isConfigured } = useNetlifyConfig();
  const [formData, setFormData] = useState({
    companyName: "",
    adminEmail: "",
    customDomain: "",
    repositoryUrl: "",
    siteName: "",
    environmentVariables: ""
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createCompany = async () => {
    if (!formData.companyName || !formData.adminEmail) {
      toast.error("Nom de l'entreprise et email administrateur requis");
      return null;
    }

    try {
      // Créer une vraie entreprise dans la base de données
      const { data: company, error } = await supabase
        .from('companies')
        .insert({
          name: formData.companyName,
          plan: 'starter'
        })
        .select()
        .single();

      if (error) {
        console.error("Erreur création entreprise:", error);
        toast.error("Erreur lors de la création de l'entreprise");
        return null;
      }

      console.log("Entreprise créée:", company);
      toast.success("Entreprise créée avec succès");
      
      return company.id;
    } catch (error) {
      console.error("Erreur création entreprise:", error);
      toast.error("Erreur lors de la création de l'entreprise");
      return null;
    }
  };

  const deployToNetlify = async (companyId: string) => {
    if (!formData.repositoryUrl) {
      toast.error("URL du repository requis pour le déploiement");
      return null;
    }

    if (!isConfigured()) {
      toast.error("Configuration Netlify manquante. Configurez Netlify d'abord.");
      return null;
    }

    try {
      setIsDeploying(true);
      console.log("Démarrage du déploiement Netlify pour:", companyId);

      // Préparer les variables d'environnement
      let envVars = {};
      if (formData.environmentVariables) {
        try {
          envVars = JSON.parse(formData.environmentVariables);
        } catch (e) {
          // Si ce n'est pas du JSON, traiter comme des paires clé=valeur séparées par des nouvelles lignes
          const lines = formData.environmentVariables.split('\n');
          lines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              envVars[key.trim()] = valueParts.join('=').trim();
            }
          });
        }
      }

      const deploymentRequest = {
        companyId: companyId,
        repositoryUrl: formData.repositoryUrl,
        siteName: formData.siteName || null,
        customDomain: formData.customDomain || null,
        autoDeploy: true,
        buildCommand: "npm run build",
        publishDirectory: "dist",
        environmentVariables: envVars
      };

      console.log("Données de déploiement:", deploymentRequest);

      // Appeler la vraie fonction edge deploy-to-netlify
      const { data, error } = await supabase.functions.invoke('deploy-to-netlify', {
        body: deploymentRequest
      });

      if (error) {
        console.error("Erreur fonction edge:", error);
        toast.error(`Erreur de déploiement: ${error.message}`);
        return null;
      }

      console.log("Résultat déploiement:", data);

      if (data?.success) {
        toast.success("Déploiement Netlify lancé avec succès!");
        setDeploymentResult(data);
        return data;
      } else {
        toast.error(`Échec du déploiement: ${data?.error || 'Erreur inconnue'}`);
        return null;
      }
    } catch (error) {
      console.error("Erreur déploiement:", error);
      toast.error("Erreur lors du déploiement Netlify");
      return null;
    } finally {
      setIsDeploying(false);
    }
  };

  const handleFullDeployment = async () => {
    try {
      // Étape 1: Créer l'entreprise
      toast.info("Création de l'entreprise...");
      const companyId = await createCompany();
      if (!companyId) return;

      // Étape 2: Déployer sur Netlify
      toast.info("Déploiement sur Netlify...");
      const deploymentData = await deployToNetlify(companyId);
      if (!deploymentData) return;

      toast.success("Configuration client complète avec succès!");
    } catch (error) {
      console.error("Erreur déploiement complet:", error);
      toast.error("Erreur lors de la configuration complète");
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: "",
      adminEmail: "",
      customDomain: "",
      repositoryUrl: "",
      siteName: "",
      environmentVariables: ""
    });
    setDeploymentResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Configuration Unifiée Client SaaS
        </h2>
        <p className="text-muted-foreground">
          Créez et déployez un nouveau client en une seule opération
        </p>
      </div>

      {/* Configuration Netlify Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Statut Configuration Netlify
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {isConfigured() ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Configuré
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Netlify est configuré et prêt pour les déploiements
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <Badge variant="destructive">Non configuré</Badge>
                <span className="text-sm text-muted-foreground">
                  Configurez Netlify dans les paramètres d'abord
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informations Client
          </CardTitle>
          <CardDescription>
            Définissez les paramètres de base pour le nouveau client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Nom de l'entreprise *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                placeholder="Ex: Entreprise ABC"
              />
            </div>
            <div>
              <Label htmlFor="adminEmail">Email administrateur *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => handleInputChange("adminEmail", e.target.value)}
                placeholder="admin@entreprise.com"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="customDomain">Domaine personnalisé (optionnel)</Label>
            <Input
              id="customDomain"
              value={formData.customDomain}
              onChange={(e) => handleInputChange("customDomain", e.target.value)}
              placeholder="monentreprise.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuration Netlify */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Configuration Netlify
          </CardTitle>
          <CardDescription>
            Paramètres pour le déploiement automatisé
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="repositoryUrl">URL du Repository Git *</Label>
            <Input
              id="repositoryUrl"
              value={formData.repositoryUrl}
              onChange={(e) => handleInputChange("repositoryUrl", e.target.value)}
              placeholder="https://github.com/username/repo.git"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Repository GitHub/GitLab contenant le code de l'application
            </p>
          </div>
          
          <div>
            <Label htmlFor="siteName">Nom du site Netlify (optionnel)</Label>
            <Input
              id="siteName"
              value={formData.siteName}
              onChange={(e) => handleInputChange("siteName", e.target.value)}
              placeholder="mon-site-client"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si vide, un nom sera généré automatiquement
            </p>
          </div>

          <div>
            <Label htmlFor="environmentVariables">Variables d'environnement (optionnel)</Label>
            <Textarea
              id="environmentVariables"
              value={formData.environmentVariables}
              onChange={(e) => handleInputChange("environmentVariables", e.target.value)}
              placeholder={`VITE_API_URL=https://api.exemple.com\nVITE_APP_NAME=Mon App\n\nOu format JSON:\n{"VITE_API_URL": "https://api.exemple.com"}`}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: clé=valeur (une par ligne) ou JSON
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Résultat du déploiement */}
      {deploymentResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Déploiement Réussi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deploymentResult.siteUrl && (
                <div>
                  <Label className="text-sm font-medium">URL du site:</Label>
                  <div className="flex items-center gap-2">
                    <Input value={deploymentResult.siteUrl} readOnly />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => window.open(deploymentResult.siteUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {deploymentResult.adminUrl && (
                <div>
                  <Label className="text-sm font-medium">Admin Netlify:</Label>
                  <div className="flex items-center gap-2">
                    <Input value={deploymentResult.adminUrl} readOnly />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => window.open(deploymentResult.adminUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {deploymentResult.siteId && (
              <div>
                <Label className="text-sm font-medium">Site ID:</Label>
                <Input value={deploymentResult.siteId} readOnly />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button
          onClick={handleFullDeployment}
          disabled={!formData.companyName || !formData.adminEmail || !formData.repositoryUrl || isDeploying}
          size="lg"
          className="min-w-[200px]"
        >
          {isDeploying ? (
            <>
              <Database className="mr-2 h-4 w-4 animate-spin" />
              Déploiement...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Déployer l'Application
            </>
          )}
        </Button>
        
        <Button
          onClick={resetForm}
          variant="outline"
          size="lg"
        >
          Réinitialiser
        </Button>
      </div>

      {/* Liens utiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Liens Utiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard/project/cifbetjefyfocafanlhv/functions/deploy-to-netlify/logs', '_blank')}
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              Logs Fonction Edge
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://app.netlify.com/teams', '_blank')}
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              Dashboard Netlify
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedClientSetup;
