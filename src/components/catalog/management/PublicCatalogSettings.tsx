import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Eye, ExternalLink, Settings2, Upload, Palette } from "lucide-react";
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
  
  const [headerEnabled, setHeaderEnabled] = React.useState(true);
  const [headerTitle, setHeaderTitle] = React.useState("");
  const [headerDescription, setHeaderDescription] = React.useState("");
  const [headerBackgroundType, setHeaderBackgroundType] = React.useState<'solid' | 'gradient' | 'image'>('gradient');
  const [headerBackgroundConfig, setHeaderBackgroundConfig] = React.useState<any>({
    gradient: { from: '#275D8C', to: '#48B5C3', direction: '135deg' }
  });
  const [iframeWidth, setIframeWidth] = React.useState("100%");
  const [iframeHeight, setIframeHeight] = React.useState("800");
  const [saving, setSaving] = React.useState(false);
  const [iframeTimestamp, setIframeTimestamp] = React.useState(Date.now());

  React.useEffect(() => {
    if (settings) {
      setHeaderEnabled(settings.header_enabled ?? true);
      setHeaderTitle(settings.header_title || "");
      setHeaderDescription(settings.header_description || "");
      setHeaderBackgroundType(settings.header_background_type || 'gradient');
      setHeaderBackgroundConfig(settings.header_background_config || {
        gradient: { from: '#275D8C', to: '#48B5C3', direction: '135deg' }
      });
      setIframeWidth(settings.iframe_width || "100%");
      setIframeHeight(settings.iframe_height || "800");
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
        header_enabled: headerEnabled,
        header_title: headerTitle,
        header_description: headerDescription,
        header_background_type: headerBackgroundType,
        header_background_config: headerBackgroundConfig,
        iframe_width: iframeWidth,
        iframe_height: iframeHeight,
      }, user.id);
      
      if (success) {
        toast.success("Configuration sauvegardée");
        // Force reload of iframe with new timestamp
        setIframeTimestamp(Date.now());
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const updateBackgroundConfig = (key: string, value: any) => {
    setHeaderBackgroundConfig(prev => ({
      ...prev,
      [headerBackgroundType]: {
        ...prev[headerBackgroundType],
        [key]: value
      }
    }));
  };

  const generateIframeCode = () => {
    const baseUrl = window.location.origin;
    const catalogUrl = companyId === 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0' 
      ? '/itakecare/catalog' 
      : `/company/${companyId}/catalog`;
    const params = new URLSearchParams();
    
    // Only add embed parameter if header is disabled
    if (!headerEnabled) params.set('embed', '1');
    params.set('t', iframeTimestamp.toString()); // Add timestamp to prevent caching
    
    const fullUrl = `${baseUrl}${catalogUrl}?${params.toString()}`;
    
    return `<iframe 
  src="${fullUrl}"
  width="${iframeWidth}" 
  height="${iframeHeight}"
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
    
    if (!headerEnabled) params.set('embed', '1');
    params.set('t', iframeTimestamp.toString()); // Add timestamp to prevent caching
    
    const fullUrl = `${baseUrl}${catalogUrl}?${params.toString()}`;
    window.open(fullUrl, '_blank');
  };

  const reloadPreview = () => {
    setIframeTimestamp(Date.now());
    toast.success("Aperçu rechargé avec les derniers paramètres");
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Configuration en-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuration en-tête
          </CardTitle>
          <CardDescription>
            Personnalisez l'affichage de l'en-tête du catalogue public
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Switch pour activer/désactiver l'en-tête */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Afficher l'en-tête</Label>
              <p className="text-sm text-muted-foreground">
                Si désactivé, seule la barre de recherche et le panier seront visibles
              </p>
            </div>
            <Switch 
              checked={headerEnabled} 
              onCheckedChange={setHeaderEnabled}
            />
          </div>

          {/* Options de personnalisation (visibles seulement si l'en-tête est activé) */}
          {headerEnabled && (
            <div className="space-y-4 pt-4 border-t">
              {/* Titre personnalisé */}
              <div className="space-y-2">
                <Label htmlFor="header-title">Titre de l'en-tête</Label>
                <Input
                  id="header-title"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder="Équipement premium reconditionné..."
                />
              </div>

              {/* Description personnalisée */}
              <div className="space-y-2">
                <Label htmlFor="header-description">Description</Label>
                <Textarea
                  id="header-description"
                  value={headerDescription}
                  onChange={(e) => setHeaderDescription(e.target.value)}
                  placeholder="Donnez à vos collaborateurs les outils dont ils ont besoin..."
                  rows={3}
                />
              </div>

              {/* Type d'arrière-plan */}
              <div className="space-y-2">
                <Label>Type d'arrière-plan</Label>
                <Select value={headerBackgroundType} onValueChange={(value: 'solid' | 'gradient' | 'image') => setHeaderBackgroundType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Couleur unie
                      </div>
                    </SelectItem>
                    <SelectItem value="gradient">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Dégradé
                      </div>
                    </SelectItem>
                    <SelectItem value="image">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Image
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Configuration spécifique selon le type */}
              {headerBackgroundType === 'solid' && (
                <div className="space-y-2">
                  <Label>Couleur</Label>
                  <Input
                    type="color"
                    value={headerBackgroundConfig.solid || '#275D8C'}
                    onChange={(e) => updateBackgroundConfig('solid', e.target.value)}
                  />
                </div>
              )}

              {headerBackgroundType === 'gradient' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Couleur de départ</Label>
                      <Input
                        type="color"
                        value={headerBackgroundConfig.gradient?.from || '#275D8C'}
                        onChange={(e) => updateBackgroundConfig('from', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Couleur d'arrivée</Label>
                      <Input
                        type="color"
                        value={headerBackgroundConfig.gradient?.to || '#48B5C3'}
                        onChange={(e) => updateBackgroundConfig('to', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Direction du dégradé</Label>
                    <Select 
                      value={headerBackgroundConfig.gradient?.direction || '135deg'} 
                      onValueChange={(value) => updateBackgroundConfig('direction', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0deg">↑ Vers le haut</SelectItem>
                        <SelectItem value="90deg">→ Vers la droite</SelectItem>
                        <SelectItem value="180deg">↓ Vers le bas</SelectItem>
                        <SelectItem value="270deg">← Vers la gauche</SelectItem>
                        <SelectItem value="45deg">↗ Diagonale haut-droite</SelectItem>
                        <SelectItem value="135deg">↘ Diagonale bas-droite</SelectItem>
                        <SelectItem value="225deg">↙ Diagonale bas-gauche</SelectItem>
                        <SelectItem value="315deg">↖ Diagonale haut-gauche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {headerBackgroundType === 'image' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL de l'image</Label>
                    <Input
                      value={headerBackgroundConfig.image?.url || ''}
                      onChange={(e) => updateBackgroundConfig('url', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select 
                        value={headerBackgroundConfig.image?.position || 'center'} 
                        onValueChange={(value) => updateBackgroundConfig('position', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center">Centre</SelectItem>
                          <SelectItem value="top">Haut</SelectItem>
                          <SelectItem value="bottom">Bas</SelectItem>
                          <SelectItem value="left">Gauche</SelectItem>
                          <SelectItem value="right">Droite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Répétition</Label>
                      <Select 
                        value={headerBackgroundConfig.image?.repeat || 'no-repeat'} 
                        onValueChange={(value) => updateBackgroundConfig('repeat', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-repeat">Aucune</SelectItem>
                          <SelectItem value="repeat">Répéter</SelectItem>
                          <SelectItem value="repeat-x">Répéter horizontalement</SelectItem>
                          <SelectItem value="repeat-y">Répéter verticalement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dimensions de l'iframe */}
      <Card>
        <CardHeader>
          <CardTitle>Dimensions de l'iframe</CardTitle>
          <CardDescription>
            Configurez la taille de l'iframe pour l'intégration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="iframe-width">Largeur</Label>
              <Select value={iframeWidth} onValueChange={setIframeWidth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100%">100% (responsive)</SelectItem>
                  <SelectItem value="400px">400px</SelectItem>
                  <SelectItem value="600px">600px</SelectItem>
                  <SelectItem value="800px">800px</SelectItem>
                  <SelectItem value="1200px">1200px</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
              {iframeWidth === 'custom' && (
                <Input
                  placeholder="ex: 750px"
                  value={iframeWidth !== 'custom' ? iframeWidth : ''}
                  onChange={(e) => setIframeWidth(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="iframe-height">Hauteur</Label>
              <Select value={iframeHeight} onValueChange={setIframeHeight}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">400px</SelectItem>
                  <SelectItem value="600">600px</SelectItem>
                  <SelectItem value="800">800px</SelectItem>
                  <SelectItem value="1000">1000px</SelectItem>
                  <SelectItem value="1200">1200px</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
              {iframeHeight === 'custom' && (
                <Input
                  placeholder="ex: 900px"
                  value={iframeHeight !== 'custom' ? iframeHeight : ''}
                  onChange={(e) => setIframeHeight(e.target.value)}
                />
              )}
            </div>
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
            <Button variant="outline" onClick={reloadPreview}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Recharger l'aperçu
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