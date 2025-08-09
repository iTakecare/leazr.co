import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Eye, ExternalLink, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { updateSiteSettings } from "@/services/settingsService";
import { toast } from "sonner";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";

const PublicCatalogSettings = () => {
  const { settings, loading } = useSiteSettings();
  const { companyId } = useMultiTenant();
  const { user } = useAuth();
  
  const [hideHeader, setHideHeader] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (settings) {
      setHideHeader(settings.public_catalog_hide_header || false);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Utilisateur non connecté");
      return;
    }

    setSaving(true);
    try {
      const success = await updateSiteSettings({
        public_catalog_hide_header: hideHeader,
      }, user.id);
      
      if (success) {
        toast.success("Configuration sauvegardée");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const generateIframeCode = () => {
    const baseUrl = window.location.origin;
    const catalogUrl = companyId === 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0' 
      ? '/itakecare/catalog' 
      : `/company/${companyId}/catalog`;
    const params = new URLSearchParams();
    
    if (hideHeader) params.set('embed', '1');
    
    const fullUrl = `${baseUrl}${catalogUrl}${params.toString() ? '?' + params.toString() : ''}`;
    
    return `<iframe 
  src="${fullUrl}"
  width="100%" 
  height="800"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`;
  };

  const copyIframeCode = () => {
    navigator.clipboard.writeText(generateIframeCode());
    toast.success("Code d'intégration copié !");
  };

  const openPreview = () => {
    const baseUrl = window.location.origin;
    const catalogUrl = companyId === 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0' 
      ? '/itakecare/catalog' 
      : `/company/${companyId}/catalog`;
    const params = new URLSearchParams();
    
    if (hideHeader) params.set('embed', '1');
    
    const fullUrl = `${baseUrl}${catalogUrl}${params.toString() ? '?' + params.toString() : ''}`;
    window.open(fullUrl, '_blank');
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Affichage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Affichage du catalogue
          </CardTitle>
          <CardDescription>
            Configurez l'apparence du catalogue public pour l'intégration externe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Masquer la barre de menu</Label>
              <p className="text-sm text-muted-foreground">
                Cache la navigation et l'en-tête pour l'intégration en iframe
              </p>
            </div>
            <Switch 
              checked={hideHeader} 
              onCheckedChange={setHideHeader}
            />
          </div>

        </CardContent>
      </Card>


      {/* Code d'intégration */}
      <Card>
        <CardHeader>
          <CardTitle>Code d'intégration iframe</CardTitle>
          <CardDescription>
            Copiez ce code dans votre site web pour intégrer le catalogue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              readOnly
              value={generateIframeCode()}
              className="min-h-[120px] font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={copyIframeCode}
              className="absolute top-2 right-2"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={openPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Aperçu
            </Button>
            <Button variant="outline" onClick={copyIframeCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copier le code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>
    </div>
  );
};

export default PublicCatalogSettings;