
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { loadPDFModel, savePDFModel, DEFAULT_MODEL } from "@/utils/pdfModelUtils";
import { PDFModel } from "@/utils/pdfModelUtils";

export const usePDFTemplate = (templateId: string = 'default') => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateExists, setTemplateExists] = useState(false);
  const [templateName, setTemplateName] = useState<string | undefined>(undefined);

  const loadTemplate = useCallback(async (id: string = 'default') => {
    console.log("loadTemplate appelé avec id:", id, "loading actuel:", loading);
    
    // Éviter les chargements multiples simultanés seulement si déjà en cours de chargement
    if (loading && template !== null) {
      console.log("Chargement déjà en cours et template existe, ignore la demande");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Chargement du modèle PDF: ${id}`);
      const data = await loadPDFModel(id);
      
      if (!data) {
        console.log("Aucun modèle trouvé, utilisation du modèle par défaut");
        const defaultTemplate = {
          ...DEFAULT_MODEL,
          templateImages: [],
          fields: []
        };
        setTemplate(defaultTemplate);
        setTemplateExists(false);
        setTemplateName("Modèle par défaut");
        toast.info("Modèle par défaut chargé");
      } else {
        console.log("Modèle chargé avec succès:", data);
        
        const sanitizedTemplate = {
          ...data,
          templateImages: Array.isArray(data.templateImages) ? data.templateImages : [],
          fields: Array.isArray(data.fields) ? data.fields : []
        };
        
        setTemplate(sanitizedTemplate);
        setTemplateExists(true);
        setTemplateName(sanitizedTemplate.name);
        toast.success(`Modèle "${sanitizedTemplate.name}" chargé avec succès`);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du modèle:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(`Erreur lors du chargement du modèle: ${errorMessage}`);
      toast.error(`Erreur lors du chargement du modèle: ${errorMessage}`);
      
      // Fallback au modèle par défaut en cas d'erreur
      const fallbackTemplate = {
        ...DEFAULT_MODEL,
        templateImages: [],
        fields: []
      };
      setTemplate(fallbackTemplate);
      setTemplateExists(false);
      setTemplateName("Modèle par défaut (fallback)");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const saveTemplate = useCallback(async (updatedTemplate: PDFModel): Promise<void> => {
    setSaving(true);
    setError(null);
    
    try {
      console.log(`Sauvegarde du modèle: ${updatedTemplate.id}`, updatedTemplate);
      
      const sanitizedTemplate: PDFModel = {
        ...updatedTemplate,
        templateImages: Array.isArray(updatedTemplate.templateImages) ? updatedTemplate.templateImages : [],
        fields: Array.isArray(updatedTemplate.fields) ? updatedTemplate.fields : [],
        updated_at: new Date().toISOString()
      };
      
      console.log("Modèle à sauvegarder (sanitisé):", sanitizedTemplate);
      console.log("Nombre d'images à sauvegarder:", sanitizedTemplate.templateImages.length);
      console.log("Nombre de champs à sauvegarder:", sanitizedTemplate.fields.length);
      
      await savePDFModel(sanitizedTemplate);
      
      setTemplate(sanitizedTemplate);
      setTemplateExists(true);
      setTemplateName(sanitizedTemplate.name);
      toast.success("Modèle sauvegardé avec succès");
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du modèle:", err);
      setError("Erreur lors de la sauvegarde du modèle: " + (err instanceof Error ? err.message : "Erreur inconnue"));
      toast.error("Erreur lors de la sauvegarde du modèle");
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    loading,
    saving,
    template,
    error,
    templateExists,
    templateName,
    loadTemplate,
    saveTemplate
  };
};
