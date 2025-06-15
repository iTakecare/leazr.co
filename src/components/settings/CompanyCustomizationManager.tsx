import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useCompanyBranding } from "@/context/CompanyBrandingContext";
import CompanyCustomizationService from "@/services/companyCustomizationService";
import { 
  Palette, 
  Upload, 
  Globe, 
  Mail, 
  Settings,
  Eye,
  Save,
  Image as ImageIcon,
  Link as LinkIcon
} from "lucide-react";

const CompanyCustomizationManager = () => {
  const { toast } = useToast();
  const { companyId } = useMultiTenant();
  const { branding, updateBranding, loading } = useCompanyBranding();
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // États pour les formulaires
  const [brandingForm, setBrandingForm] = useState({
    primary_color: branding?.primary_color || "#3b82f6",
    secondary_color: branding?.secondary_color || "#64748b",
    accent_color: branding?.accent_color || "#8b5cf6",
    logo_url: branding?.logo_url || "",
    favicon_url: branding?.favicon_url || "",
    custom_domain: branding?.custom_domain || ""
  });

  const [companyInfo, setCompanyInfo] = useState({
    description: "",
    website_url: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    social_linkedin: "",
    social_twitter: "",
    social_facebook: ""
  });

  const [catalogSettings, setCatalogSettings] = useState({
    show_prices: true,
    show_monthly_pricing: true,
    enable_requests: true,
    auto_approve_requests: false,
    featured_categories: [] as string[],
    custom_header_text: "",
    custom_footer_text: ""
  });

  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      setSaving(true);
      await updateBranding(brandingForm);
      
      toast({
        title: "Branding mis à jour",
        description: "Les couleurs et le style de votre entreprise ont été sauvegardés.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le branding.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    try {
      setSaving(true);
      const logoUrl = await CompanyCustomizationService.uploadCompanyAsset(
        companyId,
        file,
        "logo"
      );

      if (logoUrl) {
        setBrandingForm(prev => ({ ...prev, logo_url: logoUrl }));
        await updateBranding({ logo_url: logoUrl });
        
        toast({
          title: "Logo mis à jour",
          description: "Votre nouveau logo a été téléchargé avec succès.",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le logo.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingSave = async (category: string, key: string, value: any) => {
    if (!companyId) return;

    try {
      await CompanyCustomizationService.setCompanySetting(companyId, category, key, value);
      
      toast({
        title: "Paramètre sauvegardé",
        description: `${key} a été mis à jour.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le paramètre.",
        variant: "destructive"
      });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personnalisation</h1>
          <p className="text-muted-foreground">
            Configurez l'apparence et les paramètres de votre entreprise
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? "Édition" : "Aperçu"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <Settings className="h-4 w-4" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2">
            <Globe className="h-4 w-4" />
            Catalogue
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Couleurs et Style
              </CardTitle>
              <CardDescription>
                Personnalisez les couleurs de votre interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBrandingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="primary_color">Couleur principale</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="color"
                        value={brandingForm.primary_color}
                        onChange={(e) => setBrandingForm(prev => ({ 
                          ...prev, 
                          primary_color: e.target.value 
                        }))}
                        className="w-12 h-10 p-1 border rounded"
                      />
                      <Input
                        value={brandingForm.primary_color}
                        onChange={(e) => setBrandingForm(prev => ({ 
                          ...prev, 
                          primary_color: e.target.value 
                        }))}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="secondary_color">Couleur secondaire</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="color"
                        value={brandingForm.secondary_color}
                        onChange={(e) => setBrandingForm(prev => ({ 
                          ...prev, 
                          secondary_color: e.target.value 
                        }))}
                        className="w-12 h-10 p-1 border rounded"
                      />
                      <Input
                        value={brandingForm.secondary_color}
                        onChange={(e) => setBrandingForm(prev => ({ 
                          ...prev, 
                          secondary_color: e.target.value 
                        }))}
                        placeholder="#64748b"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accent_color">Couleur d'accent</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="color"
                        value={brandingForm.accent_color}
                        onChange={(e) => setBrandingForm(prev => ({ 
                          ...prev, 
                          accent_color: e.target.value 
                        }))}
                        className="w-12 h-10 p-1 border rounded"
                      />
                      <Input
                        value={brandingForm.accent_color}
                        onChange={(e) => setBrandingForm(prev => ({ 
                          ...prev, 
                          accent_color: e.target.value 
                        }))}
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logo_upload">Logo de l'entreprise</Label>
                    <div className="mt-2 space-y-2">
                      {brandingForm.logo_url && (
                        <div className="flex items-center gap-4 p-3 border rounded-lg">
                          <img 
                            src={brandingForm.logo_url} 
                            alt="Logo actuel"
                            className="h-12 w-auto"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Logo actuel</p>
                            <p className="text-xs text-muted-foreground">
                              {brandingForm.logo_url}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                        />
                        <Button type="button" variant="outline" size="sm">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="custom_domain">Domaine personnalisé</Label>
                    <Input
                      value={brandingForm.custom_domain}
                      onChange={(e) => setBrandingForm(prev => ({ 
                        ...prev, 
                        custom_domain: e.target.value 
                      }))}
                      placeholder="votreentreprise.com"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Configurez un domaine personnalisé pour votre catalogue public
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: brandingForm.primary_color }}
                    />
                    <div 
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: brandingForm.secondary_color }}
                    />
                    <div 
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: brandingForm.accent_color }}
                    />
                    <span className="text-sm text-muted-foreground">Aperçu des couleurs</span>
                  </div>
                  
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Sauvegarder
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configuration du Catalogue
              </CardTitle>
              <CardDescription>
                Personnalisez l'affichage et le comportement de votre catalogue public
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Afficher les prix</Label>
                      <p className="text-sm text-muted-foreground">
                        Montrer les prix d'achat des produits
                      </p>
                    </div>
                    <Switch
                      checked={catalogSettings.show_prices}
                      onCheckedChange={(checked) => {
                        setCatalogSettings(prev => ({ ...prev, show_prices: checked }));
                        handleSettingSave("catalog", "show_prices", checked);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Prix mensuels</Label>
                      <p className="text-sm text-muted-foreground">
                        Afficher les options de financement mensuel
                      </p>
                    </div>
                    <Switch
                      checked={catalogSettings.show_monthly_pricing}
                      onCheckedChange={(checked) => {
                        setCatalogSettings(prev => ({ ...prev, show_monthly_pricing: checked }));
                        handleSettingSave("catalog", "show_monthly_pricing", checked);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Activer les demandes</Label>
                      <p className="text-sm text-muted-foreground">
                        Permettre aux visiteurs de demander des devis
                      </p>
                    </div>
                    <Switch
                      checked={catalogSettings.enable_requests}
                      onCheckedChange={(checked) => {
                        setCatalogSettings(prev => ({ ...prev, enable_requests: checked }));
                        handleSettingSave("catalog", "enable_requests", checked);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Texte d'en-tête personnalisé</Label>
                    <Textarea
                      value={catalogSettings.custom_header_text}
                      onChange={(e) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        custom_header_text: e.target.value 
                      }))}
                      placeholder="Message d'accueil personnalisé..."
                      className="mt-1"
                      onBlur={() => handleSettingSave("catalog", "custom_header_text", catalogSettings.custom_header_text)}
                    />
                  </div>

                  <div>
                    <Label>Texte de pied de page</Label>
                    <Textarea
                      value={catalogSettings.custom_footer_text}
                      onChange={(e) => setCatalogSettings(prev => ({ 
                        ...prev, 
                        custom_footer_text: e.target.value 
                      }))}
                      placeholder="Informations de contact, mentions légales..."
                      className="mt-1"
                      onBlur={() => handleSettingSave("catalog", "custom_footer_text", catalogSettings.custom_footer_text)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'entreprise</CardTitle>
              <CardDescription>
                Gérez les informations publiques de votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={companyInfo.description}
                    onChange={(e) => setCompanyInfo(prev => ({ 
                      ...prev, 
                      description: e.target.value 
                    }))}
                    placeholder="Description de votre entreprise..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Site web</Label>
                  <Input
                    value={companyInfo.website_url}
                    onChange={(e) => setCompanyInfo(prev => ({ 
                      ...prev, 
                      website_url: e.target.value 
                    }))}
                    placeholder="https://votresite.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Email de contact</Label>
                  <Input
                    type="email"
                    value={companyInfo.contact_email}
                    onChange={(e) => setCompanyInfo(prev => ({ 
                      ...prev, 
                      contact_email: e.target.value 
                    }))}
                    placeholder="contact@votreentreprise.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={companyInfo.contact_phone}
                    onChange={(e) => setCompanyInfo(prev => ({ 
                      ...prev, 
                      contact_phone: e.target.value 
                    }))}
                    placeholder="+33 1 23 45 67 89"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Templates Email
              </CardTitle>
              <CardDescription>
                Personnalisez les emails automatiques envoyés par votre système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Templates Email</h3>
                <p className="text-muted-foreground mb-4">
                  La gestion des templates email sera disponible prochainement
                </p>
                <Badge variant="secondary">À venir</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyCustomizationManager;