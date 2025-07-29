import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPlatformSettings, updatePlatformSettings, PlatformSettings } from '@/services/platformSettingsService';
import AvatarUploader from '@/components/settings/AvatarUploader';

const PlatformIdentitySettings = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getPlatformSettings();
        if (data) {
          setSettings(data);
        } else {
          // Si aucune donnée n'est retournée, initialiser avec des valeurs par défaut
          setSettings({
            company_name: 'Leazr',
            company_description: '',
            company_address: '',
            company_phone: '',
            company_email: '',
            logo_url: '',
            primary_color: '#3b82f6',
            secondary_color: '#64748b',
            accent_color: '#8b5cf6'
          });
        }
      } catch (err) {
        console.error("Erreur lors du chargement des paramètres de plateforme:", err);
        setError("Impossible de charger les paramètres de plateforme");
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (settings) {
      setSettings({
        ...settings,
        [name]: value
      });
    }
  };

  const handleLogoUploaded = (logoUrl: string) => {
    if (settings) {
      setSettings({
        ...settings,
        logo_url: logoUrl
      });
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setIsSaving(true);
      setError(null);
      
      const success = await updatePlatformSettings(settings);
      if (success) {
        toast.success("Paramètres de plateforme enregistrés avec succès");
      } else {
        setError("Erreur lors de l'enregistrement des paramètres de plateforme");
        toast.error("Erreur lors de l'enregistrement des paramètres de plateforme");
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement des paramètres de plateforme:", err);
      setError("Erreur lors de l'enregistrement des paramètres de plateforme");
      toast.error("Erreur lors de l'enregistrement des paramètres de plateforme");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identité de l'entreprise Leazr</CardTitle>
        <CardDescription>
          Configurez l'identité globale de la plateforme Leazr (logo, coordonnées, etc.)
        </CardDescription>
      </CardHeader>
      
      {error && (
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      )}
      
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Logo de Leazr</Label>
            <AvatarUploader 
              initialImageUrl={settings?.logo_url || ''}
              onImageUploaded={handleLogoUploaded}
              bucketName="site-settings"
              folderPath="platform-logos"
            />
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom de l'entreprise</Label>
            <Input 
              id="company_name" 
              name="company_name" 
              value={settings?.company_name || ''} 
              onChange={handleInputChange} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_description">Description</Label>
            <Textarea 
              id="company_description" 
              name="company_description" 
              value={settings?.company_description || ''} 
              onChange={handleInputChange} 
              rows={3}
              placeholder="Description de l'entreprise Leazr"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company_address">Adresse</Label>
            <Textarea 
              id="company_address" 
              name="company_address" 
              value={settings?.company_address || ''} 
              onChange={handleInputChange} 
              rows={2} 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_phone">Téléphone</Label>
              <Input 
                id="company_phone" 
                name="company_phone" 
                value={settings?.company_phone || ''} 
                onChange={handleInputChange} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_email">Email</Label>
              <Input 
                id="company_email" 
                name="company_email" 
                type="email" 
                value={settings?.company_email || ''} 
                onChange={handleInputChange} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Site web</Label>
            <Input 
              id="website_url" 
              name="website_url" 
              type="url" 
              value={settings?.website_url || ''} 
              onChange={handleInputChange} 
              placeholder="https://..."
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="justify-end">
        <Button onClick={handleSave} disabled={isSaving || !settings?.company_name}>
          {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PlatformIdentitySettings;