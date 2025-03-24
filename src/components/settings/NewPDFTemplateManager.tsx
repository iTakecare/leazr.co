
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ensureBucket } from "@/services/fileStorage";
import { loadTemplate, saveTemplate, PDFTemplate } from "@/utils/templateManager";
import PDFCompanyInfo from "./PDFCompanyInfo";
import NewPDFTemplateEditor from "./NewPDFTemplateEditor";
import SimplePDFPreview from "./SimplePDFPreview";

const NewPDFTemplateManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [error, setError] = useState<string | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Initialisation du gestionnaire au montage du composant
  useEffect(() => {
    console.log("Initialisation du gestionnaire de templates");
    initializeManager();
    
    // Nettoyer le timeout lors du démontage
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, []);
  
  const initializeManager = async () => {
    try {
      setLoading(true);
      setError(null);
      
      try {
        await ensureBucket('pdf-templates');
      } catch (e) {
        console.warn("Problème avec le bucket de stockage:", e);
        toast.warning("Stockage en mode local uniquement");
      }
      
      const templateData = await loadTemplate();
      
      if (templateData) {
        console.log("Template chargé avec succès");
        console.log("Nombre d'images:", templateData.templateImages ? templateData.templateImages.length : 0);
        console.log("Nombre de champs:", templateData.fields ? templateData.fields.length : 0);
        
        // S'assurer que les tableaux sont correctement initialisés
        const sanitizedTemplate = {
          ...templateData,
          templateImages: Array.isArray(templateData.templateImages) ? templateData.templateImages : [],
          fields: Array.isArray(templateData.fields) ? templateData.fields : []
        };
        
        setTemplate(sanitizedTemplate);
        toast.success("Modèle chargé avec succès");
      } else {
        console.error("Impossible de charger le template");
        toast.error("Erreur lors du chargement du modèle");
      }
    } catch (err) {
      console.error("Erreur d'initialisation:", err);
      setError("Erreur lors de l'initialisation");
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction optimisée pour sauvegarder avec un debounce
  const handleSaveTemplate = useCallback(async (updatedTemplate: PDFTemplate) => {
    try {
      setSaving(true);
      setError(null);
      
      // Annuler tout timeout de sauvegarde en cours
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        setSaveTimeout(null);
      }
      
      console.log("Préparation sauvegarde du template:", updatedTemplate.name);
      console.log("Nombre d'images:", updatedTemplate.templateImages ? updatedTemplate.templateImages.length : 0);
      console.log("Nombre de champs:", updatedTemplate.fields ? updatedTemplate.fields.length : 0);
      
      // S'assurer que les champs ont des coordonnées valides
      if (Array.isArray(updatedTemplate.fields)) {
        updatedTemplate.fields = updatedTemplate.fields.map(field => {
          if (!field.position || typeof field.position.x !== 'number' || typeof field.position.y !== 'number') {
            return {
              ...field,
              position: { x: 10, y: 10 } // Valeurs par défaut
            };
          }
          
          // Arrondir les valeurs à 1 décimale
          return {
            ...field,
            position: {
              x: Math.round(field.position.x * 10) / 10,
              y: Math.round(field.position.y * 10) / 10
            }
          };
        });
      }
      
      // Sauvegarder les modifications
      const success = await saveTemplate(updatedTemplate);
      
      if (success) {
        setTemplate(updatedTemplate);
        // Toast déjà affiché dans SimplePDFPreview
      } else {
        setError("Erreur lors de la sauvegarde");
        toast.error("Erreur lors de la sauvegarde du modèle");
      }
    } catch (err: any) {
      console.error("Exception lors de la sauvegarde:", err);
      const errorMessage = err.message || "Erreur lors de la sauvegarde";
      setError(errorMessage);
      toast.error(`Erreur: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  }, [saveTimeout]);
  
  const handleCompanyInfoUpdate = useCallback(async (companyInfo: Partial<PDFTemplate>) => {
    if (template) {
      const updatedTemplate = {
        ...template,
        ...companyInfo
      };
      
      await handleSaveTemplate(updatedTemplate);
    }
  }, [template, handleSaveTemplate]);
  
  const handleTemplateUpdate = useCallback(async (updatedTemplate: PDFTemplate) => {
    await handleSaveTemplate(updatedTemplate);
  }, [handleSaveTemplate]);
  
  const handleRetry = () => {
    initializeManager();
  };
  
  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionnaire de modèles PDF</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Rafraîchir
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => template && handleSaveTemplate(template)}
            disabled={saving || loading || !template}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="self-start" 
                onClick={handleRetry}
              >
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Chargement du modèle...
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="company">Informations de l'entreprise</TabsTrigger>
              <TabsTrigger value="design">Conception du modèle</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
            </TabsList>
            
            <TabsContent value="company" className="mt-6">
              {template && (
                <PDFCompanyInfo 
                  template={template} 
                  onSave={handleCompanyInfoUpdate} 
                  loading={saving}
                />
              )}
            </TabsContent>
            
            <TabsContent value="design" className="mt-6">
              {template && (
                <NewPDFTemplateEditor
                  template={template}
                  onSave={handleTemplateUpdate}
                />
              )}
            </TabsContent>
            
            <TabsContent value="preview" className="mt-6">
              {template && (
                <SimplePDFPreview 
                  template={template}
                  onSave={handleTemplateUpdate}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default NewPDFTemplateManager;
