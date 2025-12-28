
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Building2, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSiteSettings, updateSiteSettings, SiteSettings } from '@/services/settingsService';
import LogoUploader from './LogoUploader';
import LessorSignatureUploader from './LessorSignatureUploader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const GeneralSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<{
    signature_url: string | null;
    signature_representative_name: string | null;
    signature_representative_title: string | null;
  }>({
    signature_url: null,
    signature_representative_name: null,
    signature_representative_title: null
  });

  const fetchSignatureData = async () => {
    if (!user?.company) return;
    const { data } = await supabase
      .from('companies')
      .select('signature_url, signature_representative_name, signature_representative_title')
      .eq('id', user.company)
      .single();
    if (data) {
      setSignatureData({
        signature_url: data.signature_url,
        signature_representative_name: data.signature_representative_name,
        signature_representative_title: data.signature_representative_title
      });
    }
  };

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
            company_postal_code: '',
            company_city: '',
            company_country: 'Belgique',
            company_phone: '',
            company_email: '',
            company_bce: '',
            company_vat_number: '',
            company_legal_form: ''
          });
        }
        await fetchSignatureData();
      } catch (err) {
        console.error("Erreur lors du chargement des paramètres:", err);
        setError("Impossible de charger les paramètres");
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [user?.company]);

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
        company_postal_code: settings.company_postal_code || '',
        company_city: settings.company_city || '',
        company_country: settings.company_country || 'Belgique',
        company_phone: settings.company_phone || '',
        company_email: settings.company_email || '',
        company_bce: settings.company_bce || '',
        company_vat_number: settings.company_vat_number || '',
        company_legal_form: settings.company_legal_form || '',
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

  return <>
    <Card>
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
      
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo de l'entreprise</Label>
          <LogoUploader 
            initialLogoUrl={settings?.logo_url || ''}
            onLogoUploaded={handleLogoUploaded}
          />
        </div>
        
        <Separator />
        
        {/* Informations légales */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-medium">Informations légales</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nom de l'entreprise</Label>
              <Input id="company_name" name="company_name" value={settings?.company_name || ''} onChange={handleInputChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_legal_form">Forme juridique</Label>
              <Select
                value={settings?.company_legal_form || ''}
                onValueChange={(value) => setSettings(prev => prev ? {...prev, company_legal_form: value} : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SRL">SRL (Société à responsabilité limitée)</SelectItem>
                  <SelectItem value="SA">SA (Société anonyme)</SelectItem>
                  <SelectItem value="SC">SC (Société coopérative)</SelectItem>
                  <SelectItem value="SNC">SNC (Société en nom collectif)</SelectItem>
                  <SelectItem value="SCS">SCS (Société en commandite simple)</SelectItem>
                  <SelectItem value="ASBL">ASBL (Association sans but lucratif)</SelectItem>
                  <SelectItem value="Indépendant">Indépendant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_bce">Numéro BCE</Label>
              <Input 
                id="company_bce" 
                name="company_bce" 
                value={settings?.company_bce || ''} 
                onChange={handleInputChange} 
                placeholder="0XXX.XXX.XXX"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_vat_number">Numéro de TVA</Label>
              <Input 
                id="company_vat_number" 
                name="company_vat_number" 
                value={settings?.company_vat_number || ''} 
                onChange={handleInputChange} 
                placeholder="BE0XXX.XXX.XXX"
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Coordonnées */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">Coordonnées</span>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company_address">Adresse (rue et numéro)</Label>
            <Input id="company_address" name="company_address" value={settings?.company_address || ''} onChange={handleInputChange} placeholder="Rue Example 123" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_postal_code">Code postal</Label>
              <Input 
                id="company_postal_code" 
                name="company_postal_code" 
                value={settings?.company_postal_code || ''} 
                onChange={handleInputChange} 
                placeholder="1000"
              />
            </div>
            
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="company_city">Localité</Label>
              <Input 
                id="company_city" 
                name="company_city" 
                value={settings?.company_city || ''} 
                onChange={handleInputChange} 
                placeholder="Bruxelles"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_country">Pays</Label>
              <Input 
                id="company_country" 
                name="company_country" 
                value={settings?.company_country || 'Belgique'} 
                onChange={handleInputChange} 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_phone">Téléphone</Label>
              <Input id="company_phone" name="company_phone" value={settings?.company_phone || ''} onChange={handleInputChange} placeholder="+32 X XXX XX XX" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_email">Email</Label>
              <Input id="company_email" name="company_email" type="email" value={settings?.company_email || ''} onChange={handleInputChange} placeholder="contact@example.be" />
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="justify-end">
        <Button onClick={handleSave} disabled={isSaving || !settings?.company_name}>
          {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </CardFooter>
    </Card>

    <div className="mt-6">
      <LessorSignatureUploader
        currentSignatureUrl={signatureData.signature_url}
        currentRepresentativeName={signatureData.signature_representative_name}
        currentRepresentativeTitle={signatureData.signature_representative_title}
        onUpdate={fetchSignatureData}
      />
    </div>
  </>;
};

export default GeneralSettings;
