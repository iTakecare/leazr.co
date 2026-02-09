import { useState, useEffect } from "react";
import { sanitizeFileName } from "@/utils/fileUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Palette, FileText, Layout, Code, Loader2 } from "lucide-react";
import PDFTemplatePreview from "./PDFTemplatePreview";
import PDFTemplateSectionManager from "./PDFTemplateSectionManager";
import { loadTemplateFiles } from "@/services/pdfTemplateLoaderService";

interface PDFTemplateEditorProps {
  template: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export default function PDFTemplateEditor({
  template,
  open,
  onOpenChange,
  onSave,
}: PDFTemplateEditorProps) {
  const [customizationData, setCustomizationData] = useState(
    template?.customization_data || {
      colors: {
        primary: "#3b82f6",
        secondary: "#64748b",
        accent: "#8b5cf6",
      },
      logo: {
        url: null,
        width: 120,
        height: 60,
      },
      images: {},
      texts: {},
      sections: {},
    }
  );
  const [htmlContent, setHtmlContent] = useState(template?.html_content || "");
  const [cssContent, setCssContent] = useState(template?.css_content || "");
  const [manifest, setManifest] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load template files on mount
  useEffect(() => {
    const loadTemplate = async () => {
      if (!template || !open) return;
      
      setIsLoading(true);
      try {
        const templateSlug = template.template_metadata?.slug || template.id || 'itakecare-v1';
        const files = await loadTemplateFiles(templateSlug);
        
        // Use database content if available, otherwise use file content
        setHtmlContent(template.html_content || files.html);
        setCssContent(template.css_content || files.css);
        setManifest(files.manifest);
        
        // Initialize sections from manifest if not already customized
        if (!template.customization_data?.sections && files.manifest.pages) {
          setCustomizationData(prev => ({
            ...prev,
            sections: files.manifest.pages.map(page => ({
              ...page,
              enabled: true,
            })),
          }));
        }
      } catch (error) {
        console.error('Error loading template files:', error);
        toast.error("Erreur lors du chargement des fichiers du template");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTemplate();
  }, [template, open]);

  const handleColorChange = (colorType: string, value: string) => {
    setCustomizationData({
      ...customizationData,
      colors: {
        ...customizationData.colors,
        [colorType]: value,
      },
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = sanitizeFileName(file.name).split(".").pop();
      const fileName = `${template.id}-logo-${Date.now()}.${fileExt}`;
      const filePath = `pdf-templates/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(filePath);

      setCustomizationData({
        ...customizationData,
        logo: {
          ...customizationData.logo,
          url: publicUrl,
        },
      });

      toast.success("Logo uploadé avec succès");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erreur lors de l'upload du logo");
    }
  };

  const handleTextChange = (key: string, value: string) => {
    setCustomizationData({
      ...customizationData,
      texts: {
        ...customizationData.texts,
        [key]: value,
      },
    });
  };

  const handleSectionsChange = (sections: any) => {
    setCustomizationData({
      ...customizationData,
      sections,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("pdf_templates")
        .update({
          customization_data: customizationData,
          html_content: htmlContent,
          css_content: cssContent,
          last_customized_at: new Date().toISOString(),
        })
        .eq("id", template.id);

      if (error) throw error;

      toast.success("Template personnalisé avec succès");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center p-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-center">Chargement du template...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Personnaliser le template - {template?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-6 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Tabs defaultValue="appearance" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="appearance" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Apparence
                </TabsTrigger>
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contenu
                </TabsTrigger>
                <TabsTrigger value="sections" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Sections
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Avancé
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appearance" className="space-y-6 mt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Couleurs</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Couleur primaire</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary-color"
                          type="color"
                          value={customizationData.colors.primary}
                          onChange={(e) => handleColorChange("primary", e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={customizationData.colors.primary}
                          onChange={(e) => handleColorChange("primary", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Couleur secondaire</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondary-color"
                          type="color"
                          value={customizationData.colors.secondary}
                          onChange={(e) => handleColorChange("secondary", e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={customizationData.colors.secondary}
                          onChange={(e) => handleColorChange("secondary", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accent-color">Couleur accent</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accent-color"
                          type="color"
                          value={customizationData.colors.accent}
                          onChange={(e) => handleColorChange("accent", e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={customizationData.colors.accent}
                          onChange={(e) => handleColorChange("accent", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Logo</h3>
                  <div className="space-y-2">
                    <Label htmlFor="logo-upload">Upload du logo</Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                    {customizationData.logo.url && (
                      <div className="mt-2">
                        <img
                          src={customizationData.logo.url}
                          alt="Logo preview"
                          className="max-h-24 border rounded"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="logo-width">Largeur (px)</Label>
                      <Input
                        id="logo-width"
                        type="number"
                        value={customizationData.logo.width}
                        onChange={(e) =>
                          setCustomizationData({
                            ...customizationData,
                            logo: {
                              ...customizationData.logo,
                              width: parseInt(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logo-height">Hauteur (px)</Label>
                      <Input
                        id="logo-height"
                        type="number"
                        value={customizationData.logo.height}
                        onChange={(e) =>
                          setCustomizationData({
                            ...customizationData,
                            logo: {
                              ...customizationData.logo,
                              height: parseInt(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-6 mt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Textes personnalisables</h3>
                  <p className="text-sm text-muted-foreground">
                    Personnalisez les textes statiques de votre template
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-tagline">Slogan de l'entreprise</Label>
                      <Input
                        id="company-tagline"
                        placeholder="Votre partenaire IT de confiance"
                        value={customizationData.texts.company_tagline || ""}
                        onChange={(e) => handleTextChange("company_tagline", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vision-statement">Déclaration de vision</Label>
                      <Textarea
                        id="vision-statement"
                        placeholder="Notre vision..."
                        value={customizationData.texts.vision_statement || ""}
                        onChange={(e) => handleTextChange("vision_statement", e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email de contact</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="contact@company.com"
                        value={customizationData.texts.contact_email || ""}
                        onChange={(e) => handleTextChange("contact_email", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sections" className="mt-4">
                <PDFTemplateSectionManager
                  template={template}
                  sections={customizationData.sections}
                  onSectionsChange={handleSectionsChange}
                />
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">HTML personnalisé</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Attention : la modification du HTML peut affecter le rendu du template
                    </p>
                    <Textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                      placeholder="<div>...</div>"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">CSS personnalisé</h3>
                    <Textarea
                      value={cssContent}
                      onChange={(e) => setCssContent(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                      placeholder=".class { ... }"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="w-1/2 border-l pl-6">
            <PDFTemplatePreview
              template={template}
              customizationData={customizationData}
              htmlContent={htmlContent}
              cssContent={cssContent}
              manifest={manifest}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
