
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ensureBucket } from "@/services/fileStorage";
import { loadTemplate, saveTemplate, PDFTemplate } from "@/utils/templateManager";
import PDFTemplateControls from "./pdf-template/PDFTemplateControls";
import PDFTemplateError from "./pdf-template/PDFTemplateError";
import PDFTemplateLoading from "./pdf-template/PDFTemplateLoading";
import PDFTemplateTabs from "./pdf-template/PDFTemplateTabs";

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
  const handleSaveTemplate = useCallback(async (updatedTemplate: PDFTemplate): Promise<void> => {
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
  
  const handleCompanyInfoUpdate = useCallback(async (companyInfo: Partial<PDFTemplate>): Promise<void> => {
    if (template) {
      const updatedTemplate = {
        ...template,
        ...companyInfo
      };
      
      await handleSaveTemplate(updatedTemplate);
    }
  }, [template, handleSaveTemplate]);
  
  const handleTemplateUpdate = useCallback(async (updatedTemplate: PDFTemplate): Promise<void> => {
    return handleSaveTemplate(updatedTemplate);
  }, [handleSaveTemplate]);
  
  const handleRetry = () => {
    initializeManager();
  };
  
  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestionnaire de modèles PDF</CardTitle>
        <PDFTemplateControls
          saving={saving}
          loading={loading}
          onSave={() => template && handleSaveTemplate(template)}
          onRefresh={handleRetry}
          hasTemplate={!!template}
        />
      </CardHeader>
      <CardContent>
        <PDFTemplateError error={error} onRetry={handleRetry} />
        
        {loading ? (
          <PDFTemplateLoading />
        ) : (
          <PDFTemplateTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            template={template}
            onCompanyInfoUpdate={handleCompanyInfoUpdate}
            onTemplateUpdate={handleTemplateUpdate}
            saving={saving}
            isNewTemplate={true}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default NewPDFTemplateManager;
