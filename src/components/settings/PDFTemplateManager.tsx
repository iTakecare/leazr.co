
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { loadTemplate, saveTemplate, PDFTemplate, DEFAULT_TEMPLATE } from "@/utils/templateManager";
import PDFCompanyInfo from "./PDFCompanyInfo";
import PDFTemplateWithFields from "./PDFTemplateWithFields";
import PDFModelUploader from "./PDFModelUploader";
import PDFTemplateImageUploader from "./PDFTemplateImageUploader";
import { v4 as uuidv4 } from "uuid";
import { resetStorageConnection, checkStorageConnection } from "@/services/fileStorage";

interface PDFTemplateManagerProps {
  templateId: string;
}

const PDFTemplateManager = ({ templateId }: PDFTemplateManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [selectedPage, setSelectedPage] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [checkingStorage, setCheckingStorage] = useState(false);

  useEffect(() => {
    const loadTemplateData = async () => {
      setLoading(true);
      try {
        console.log("Chargement du template:", templateId);
        const templateData = await loadTemplate(templateId);
        setTemplate(templateData);
        console.log("Template chargé:", templateData);
        
        // Check storage connection once template is loaded
        await verifyStorageConnection();
      } catch (error) {
        console.error("Erreur lors du chargement du template:", error);
        
        // Vérifier si l'erreur est liée au stockage
        if (error instanceof Error && error.message.includes("bucket")) {
          setStorageError(error.message);
          toast.error("Erreur avec le bucket de stockage. Vous pouvez continuer à utiliser l'application, mais l'upload d'images pourrait ne pas fonctionner.");
        } else {
          toast.error("Erreur lors du chargement du template");
        }
      } finally {
        setLoading(false);
      }
    };

    loadTemplateData();
  }, [templateId]);

  const verifyStorageConnection = async () => {
    try {
      setCheckingStorage(true);
      const isConnected = await checkStorageConnection();
      if (!isConnected) {
        setStorageError("Problème de connexion au stockage Supabase. L'upload d'images pourrait ne pas fonctionner.");
      } else {
        setStorageError(null);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de la connexion au stockage:", error);
      setStorageError("Erreur lors de la vérification de la connexion au stockage");
    } finally {
      setCheckingStorage(false);
    }
  };

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
    
    const offerImageData = {
      id: uuidv4(),
      name: "Page d'offre",
      data: "/lovable-uploads/849a0eeb-fc21-4e26-81bf-c5353df2f650.png",
      page: template.templateImages.length
    };
    
    const updatedTemplate = {
      ...template,
      templateImages: [...template.templateImages, offerImageData]
    };
    
    setTemplate(updatedTemplate);
    handleSaveTemplate(updatedTemplate);
    toast.success("Page d'offre ajoutée au modèle");
    
    setSelectedPage(updatedTemplate.templateImages.length - 1);
    setActiveTab("design");
  };

  const handleImagesChange = (images: any[]) => {
    if (!template) return;
    
    // Convert the images from the ImageUploader format back to the template format
    const formattedImages = images.map(img => ({
      id: img.id,
      name: img.name,
      data: img.data,
      page: img.page
    }));
    
    const updatedTemplate = {
      ...template,
      templateImages: formattedImages
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

  const handlePageSelect = (page: number) => {
    setSelectedPage(page);
  };

  const handleRetryConnection = async () => {
    try {
      setStorageError("Vérification de la connexion...");
      const reconnected = await resetStorageConnection();
      
      if (reconnected) {
        setStorageError(null);
        toast.success("Connexion au stockage rétablie");
        
        // Recharger le template
        const templateData = await loadTemplate(templateId);
        setTemplate(templateData);
      } else {
        setStorageError("Impossible de se connecter au stockage. Veuillez vérifier votre connexion réseau.");
        toast.error("Erreur de connexion au stockage");
      }
    } catch (error) {
      console.error("Erreur lors de la tentative de reconnexion:", error);
      setStorageError(error instanceof Error ? error.message : "Erreur inconnue");
      toast.error("Échec de la reconnexion au stockage");
    }
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
        {storageError && (
          <div className="mt-2 p-3 text-sm bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                <div>
                  <strong>Attention:</strong> Un problème a été détecté avec le stockage Supabase. 
                  L'upload d'images pourrait ne pas fonctionner correctement.
                  Vous pouvez continuer à utiliser les autres fonctionnalités.
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetryConnection}
                className="ml-2"
                disabled={checkingStorage}
              >
                {checkingStorage ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Réessayer
              </Button>
            </div>
          </div>
        )}
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
            <PDFCompanyInfo 
              template={template} 
              onSave={handleCompanyInfoUpdate}
              loading={saving}
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
              onPageSelect={handlePageSelect}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PDFTemplateManager;
