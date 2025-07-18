
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Globe, Code, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CompanyFormData {
  companyName: string;
  repositoryUrl: string;
  siteName: string;
  description: string;
  plan: string;
  adminEmail: string;
}

const UnifiedClientSetup = () => {
  const [formData, setFormData] = useState<CompanyFormData>({
    companyName: '',
    repositoryUrl: 'https://github.com/iTakecare/leazr.co',
    siteName: '',
    description: '',
    plan: 'starter',
    adminEmail: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fonction pour générer un email unique basé sur le nom de l'entreprise
  const generateUniqueEmail = (companyName: string): string => {
    const timestamp = Date.now();
    const cleanCompanyName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10); // Limiter à 10 caractères
    
    return `admin-${cleanCompanyName}-${timestamp}@temp.leazr.co`;
  };

  // Fonction pour créer une entreprise
  const createCompany = async (): Promise<string | null> => {
    if (!formData.companyName.trim()) {
      toast.error("Le nom de l'entreprise est requis");
      return null;
    }

    try {
      // Générer un email unique automatiquement
      const uniqueEmail = generateUniqueEmail(formData.companyName);
      
      console.log("Création d'entreprise avec admin:", {
        companyName: formData.companyName,
        adminEmail: uniqueEmail
      });

      const { data, error } = await supabase.functions.invoke('create-company-with-admin', {
        body: {
          companyName: formData.companyName,
          adminEmail: uniqueEmail,
          adminPassword: 'TempPassword123!', // Mot de passe temporaire
          adminFirstName: 'Admin',
          adminLastName: 'User',
          plan: formData.plan || 'starter',
          selectedModules: ['calculator', 'catalog'] // Modules par défaut
        }
      });

      if (error) {
        console.error("Erreur fonction edge:", error);
        toast.error(`Erreur lors de la création de l'entreprise: ${error.message}`);
        return null;
      }

      if (data?.success) {
        console.log("Entreprise créée:", data);
        toast.success(`Entreprise créée avec succès. Email admin: ${uniqueEmail}`);
        
        // Mettre à jour le formulaire avec l'email généré pour information
        setFormData(prev => ({ ...prev, adminEmail: uniqueEmail }));
        
        return data.companyId;
      } else {
        console.error("Échec création entreprise:", data);
        toast.error(`Échec de la création: ${data?.error || 'Erreur inconnue'}`);
        return null;
      }
    } catch (error) {
      console.error("Erreur création entreprise:", error);
      toast.error("Erreur lors de la création de l'entreprise");
      return null;
    }
  };

  // Fonction pour déployer sur Netlify
  const deployToNetlify = async (companyId: string): Promise<boolean> => {
    try {
      console.log("Déploiement Netlify pour l'entreprise:", companyId);

      const { data, error } = await supabase.functions.invoke('deploy-to-netlify', {
        body: {
          companyId: companyId,
          repositoryUrl: formData.repositoryUrl,
          siteName: formData.siteName || undefined
        }
      });

      if (error) {
        console.error("Erreur déploiement Netlify:", error);
        toast.error(`Erreur lors du déploiement: ${error.message}`);
        return false;
      }

      if (data?.success) {
        console.log("Déploiement réussi:", data);
        toast.success(`Déploiement réussi! Site URL: ${data.siteUrl}`);
        return true;
      } else {
        console.error("Échec déploiement:", data);
        toast.error(`Échec du déploiement: ${data?.error || 'Erreur inconnue'}`);
        return false;
      }
    } catch (error) {
      console.error("Erreur déploiement:", error);
      toast.error("Erreur lors du déploiement");
      return false;
    }
  };

  // Fonction principale de soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Étape 1: Créer l'entreprise
      const companyId = await createCompany();
      if (!companyId) {
        return;
      }

      // Étape 2: Déployer sur Netlify
      const deploymentSuccess = await deployToNetlify(companyId);
      
      if (deploymentSuccess) {
        toast.success("Configuration complète terminée avec succès!");
        // Réinitialiser le formulaire
        setFormData({
          companyName: '',
          repositoryUrl: 'https://github.com/iTakecare/leazr.co',
          siteName: '',
          description: '',
          plan: 'starter',
          adminEmail: ''
        });
      }

    } catch (error) {
      console.error("Erreur lors de la configuration:", error);
      toast.error("Erreur lors de la configuration complète");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configuration Client Unifiée
          </CardTitle>
          <CardDescription>
            Créez une nouvelle entreprise et déployez automatiquement son application Leazr
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Configuration Entreprise */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4" />
                <h3 className="text-sm font-medium">Informations Entreprise</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l'entreprise *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="Ex: MonEntreprise"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={formData.plan} onValueChange={(value) => setFormData({...formData, plan: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter (49€/mois)</SelectItem>
                      <SelectItem value="pro">Pro (149€/mois)</SelectItem>
                      <SelectItem value="business">Business (299€/mois)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Description de l'entreprise..."
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Configuration Déploiement */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4" />
                <h3 className="text-sm font-medium">Configuration Déploiement</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repositoryUrl">URL du Repository</Label>
                  <Input
                    id="repositoryUrl"
                    value={formData.repositoryUrl}
                    onChange={(e) => setFormData({...formData, repositoryUrl: e.target.value})}
                    placeholder="https://github.com/username/repo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteName">Nom du site (optionnel)</Label>
                  <Input
                    id="siteName"
                    value={formData.siteName}
                    onChange={(e) => setFormData({...formData, siteName: e.target.value})}
                    placeholder="Auto-généré si vide"
                  />
                </div>
              </div>
            </div>

            {/* Affichage de l'email généré */}
            {formData.adminEmail && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Email admin généré:</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {formData.adminEmail}
                </Badge>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.companyName.trim()}
                className="min-w-[200px]"
              >
                {isSubmitting ? (
                  "Configuration en cours..."
                ) : (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Créer et Déployer
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Informations sur le processus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Processus de Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium">1</span>
            </div>
            <span>Création de l'entreprise dans la base de données</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium">2</span>
            </div>
            <span>Génération automatique d'un email admin unique</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium">3</span>
            </div>
            <span>Déploiement automatique sur Netlify</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium">4</span>
            </div>
            <span>Configuration du sous-domaine Cloudflare</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedClientSetup;
