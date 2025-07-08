
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
import { getSiteSettings, updateSiteSettings, SiteSettings } from '@/services/settingsService';
import LogoUploader from './LogoUploader';

const GeneralSettings = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getSiteSettings();
        if (data) {
          setSettings(data);
        } else {
          // Si aucune donnée n'est retournée, initialiser avec des valeurs vides
          setSettings({
            company_name: '',
            company_address: '',
            company_phone: '',
            company_email: ''
          });
        }
      } catch (err) {
        console.error("Erreur lors du chargement des paramètres:", err);
        setError("Impossible de charger les paramètres");
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
      
      // S'assurer que toutes les propriétés requises sont présentes
      const updatedSettings: SiteSettings = {
        id: settings.id,
        company_id: settings.company_id,
        company_name: settings.company_name || '',
        company_address: settings.company_address || '',
        company_phone: settings.company_phone || '',
        company_email: settings.company_email || '',
        logo_url: settings.logo_url || '',
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color
      };
      
      const success = await updateSiteSettings(updatedSettings);
      if (success) {
        toast.success("Paramètres enregistrés avec succès");
      } else {
        setError("Erreur lors de l'enregistrement des paramètres");
        toast.error("Erreur lors de l'enregistrement des paramètres");
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement des paramètres:", err);
      setError("Erreur lors de l'enregistrement des paramètres");
      toast.error("Erreur lors de l'enregistrement des paramètres");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>)}
        </CardContent>
      </Card>;
  }

  return <Card>
      <CardHeader>
        <CardTitle>Paramètres généraux</CardTitle>
        <CardDescription>
          Configurez les informations de votre entreprise
        </CardDescription>
      </CardHeader>
      
      {error && <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>}
      
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Logo de l'entreprise</Label>
            <LogoUploader 
              initialLogoUrl={settings?.logo_url || ''}
              onLogoUploaded={handleLogoUploaded}
            />
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom de l'entreprise</Label>
            <Input id="company_name" name="company_name" value={settings?.company_name || ''} onChange={handleInputChange} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company_address">Adresse</Label>
            <Textarea id="company_address" name="company_address" value={settings?.company_address || ''} onChange={handleInputChange} rows={2} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_phone">Téléphone</Label>
              <Input id="company_phone" name="company_phone" value={settings?.company_phone || ''} onChange={handleInputChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_email">Email</Label>
              <Input id="company_email" name="company_email" type="email" value={settings?.company_email || ''} onChange={handleInputChange} />
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="justify-end">
        <Button onClick={handleSave} disabled={isSaving || !settings?.company_name}>
          {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </CardFooter>
    </Card>;
};

export default GeneralSettings;
