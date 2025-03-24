
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { loadTemplate, saveTemplate, PDFTemplate, DEFAULT_TEMPLATE } from "@/utils/templateManager";
import PDFModelCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateWithFields from "./PDFTemplateWithFields";
import PDFModelUploader from "./PDFModelUploader";
import PDFTemplateImageUploader from "./PDFTemplateImageUploader";
import { v4 as uuidv4 } from "uuid";

interface PDFTemplateManagerProps {
  templateId: string;
}

const PDFTemplateManager = ({ templateId }: PDFTemplateManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [selectedPage, setSelectedPage] = useState(0);

  useEffect(() => {
    const loadTemplateData = async () => {
      setLoading(true);
      try {
        console.log("Chargement du template:", templateId);
        const templateData = await loadTemplate(templateId);
        setTemplate(templateData);
        console.log("Template chargé:", templateData);
      } catch (error) {
        console.error("Erreur lors du chargement du template:", error);
        toast.error("Erreur lors du chargement du template");
      } finally {
        setLoading(false);
      }
    };

    loadTemplateData();
  }, [templateId]);

  const handleSaveTemplate = async (updatedTemplate: PDFTemplate) => {
    setSaving(true);
    try {
      await saveTemplate(updatedTemplate);
      setTemplate(updatedTemplate);
      toast.success("Template sauvegardé avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du template:", error);
      toast.error("Erreur lors de la sauvegarde du template");
    } finally {
      setSaving(false);
    }
  };

  const handleAddOfferPage = () => {
    if (!template) return;
    
    // Créer une copie de l'offre exemple et l'ajouter comme image template
    const offerImageData = {
      id: uuidv4(),
      name: "Page d'offre",
      data: "/lovable-uploads/849a0eeb-fc21-4e26-81bf-c5353df2f650.png", // URL de l'image téléchargée
      page: template.templateImages.length
    };
    
    const updatedTemplate = {
      ...template,
      templateImages: [...template.templateImages, offerImageData]
    };
    
    setTemplate(updatedTemplate);
    handleSaveTemplate(updatedTemplate);
    toast.success("Page d'offre ajoutée au modèle");
    
    // Sélectionner la nouvelle page
    setSelectedPage(updatedTemplate.templateImages.length - 1);
    
    // Passer à l'onglet de conception
    setActiveTab("design");
  };

  const handleImagesChange = (images: any[]) => {
    if (!template) return;
    
    const updatedTemplate = {
      ...template,
      templateImages: images
    };
    
    setTemplate(updatedTemplate);
    handleSaveTemplate(updatedTemplate);
  };

  const handleCompanyInfoUpdate = (companyInfo: Partial<PDFTemplate>) => {
    if (!template) return;
    
    const updatedTemplate = {
      ...template,
      ...companyInfo
    };
    
    handleSaveTemplate(updatedTemplate);
  };

  if (loading) {
    return (
      <Card className="w-full mt-6">
        <CardContent className="flex justify-center items-center p-6">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-2">Chargement du modèle...</p>
        </CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card className="w-full mt-6">
        <CardContent className="p-6">
          <p className="text-red-500">Impossible de charger le modèle.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Gestion du modèle: {template.name}</CardTitle>
          <div className="flex space-x-2">
            <Button 
              onClick={handleAddOfferPage}
              variant="default"
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter page offre
            </Button>
            <Button 
              onClick={() => handleSaveTemplate(template)} 
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sauvegarde...
                </>
              ) : (
                "Sauvegarder"
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Personnalisez les informations et l'apparence de votre modèle PDF
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company">Informations de l'entreprise</TabsTrigger>
            <TabsTrigger value="pages">Pages du modèle</TabsTrigger>
            <TabsTrigger value="design">Conception du modèle</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company" className="mt-6">
            <PDFModelCompanyInfo 
              model={template} 
              onSave={handleCompanyInfoUpdate}
            />
          </TabsContent>
          
          <TabsContent value="pages" className="mt-6">
            <PDFTemplateImageUploader
              templateImages={template.templateImages}
              onChange={handleImagesChange}
              selectedPage={selectedPage}
              onPageSelect={setSelectedPage}
            />
          </TabsContent>
          
          <TabsContent value="design" className="mt-6">
            <PDFTemplateWithFields 
              template={template}
              onSave={handleSaveTemplate}
              selectedPage={selectedPage}
              onPageSelect={setSelectedPage}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PDFTemplateManager;
