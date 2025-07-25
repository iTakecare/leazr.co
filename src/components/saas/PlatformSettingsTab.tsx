import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Save, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import LogoUploader from "@/components/settings/LogoUploader";

interface PlatformSettings {
  id?: string;
  company_name: string;
  company_description?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  website_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
}

const PlatformSettingsTab = () => {
  const { settings, loading, error, updateSettings } = usePlatformSettings();
  const [formData, setFormData] = useState<Partial<PlatformSettings>>(settings || {});
  const [saving, setSaving] = useState(false);

  // Mettre à jour le formulaire quand les settings sont chargés
  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, logo_url: url }));
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await updateSettings(formData);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des paramètres: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de l'entreprise Leazr</CardTitle>
          <CardDescription>
            Gérez les informations globales de la plateforme qui apparaîtront sur les pages publiques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nom de l'entreprise</Label>
              <Input
                id="company_name"
                value={formData.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Leazr"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_email">Email de contact</Label>
              <Input
                id="company_email"
                type="email"
                value={formData.company_email || ''}
                onChange={(e) => handleInputChange('company_email', e.target.value)}
                placeholder="contact@leazr.co"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_phone">Téléphone</Label>
              <Input
                id="company_phone"
                value={formData.company_phone || ''}
                onChange={(e) => handleInputChange('company_phone', e.target.value)}
                placeholder="+33 1 23 45 67 89"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website_url">Site web</Label>
              <Input
                id="website_url"
                value={formData.website_url || ''}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                placeholder="https://leazr.co"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="company_description">Description</Label>
            <Textarea
              id="company_description"
              value={formData.company_description || ''}
              onChange={(e) => handleInputChange('company_description', e.target.value)}
              placeholder="Plateforme SaaS de gestion de leasing"
              rows={3}
            />
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="company_address">Adresse complète</Label>
            <Textarea
              id="company_address"
              value={formData.company_address || ''}
              onChange={(e) => handleInputChange('company_address', e.target.value)}
              placeholder="123 Rue de l'Innovation, 75001 Paris, France"
              rows={2}
            />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo de la plateforme</Label>
          <LogoUploader
            initialLogoUrl={formData.logo_url}
            onLogoUploaded={handleLogoUploaded}
            bucketName="site-settings"
            folderPath="platform"
          />
            <p className="text-sm text-muted-foreground">
              Ce logo apparaîtra sur les pages de connexion, d'accueil et autres pages publiques
            </p>
          </div>

          {/* Couleurs */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Couleurs de la marque</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Couleur primaire</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color || '#3b82f6'}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={formData.primary_color || '#3b82f6'}
                    onChange={(e) => handleInputChange('primary_color', e.target.value)}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondary_color">Couleur secondaire</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={formData.secondary_color || '#64748b'}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={formData.secondary_color || '#64748b'}
                    onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                    placeholder="#64748b"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accent_color">Couleur d'accent</Label>
                <div className="flex gap-2">
                  <Input
                    id="accent_color"
                    type="color"
                    value={formData.accent_color || '#8b5cf6'}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={formData.accent_color || '#8b5cf6'}
                    onChange={(e) => handleInputChange('accent_color', e.target.value)}
                    placeholder="#8b5cf6"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Réseaux sociaux</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url || ''}
                  onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/company/leazr"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="twitter_url">Twitter/X</Label>
                <Input
                  id="twitter_url"
                  value={formData.twitter_url || ''}
                  onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                  placeholder="https://twitter.com/leazr"
                />
              </div>
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformSettingsTab;