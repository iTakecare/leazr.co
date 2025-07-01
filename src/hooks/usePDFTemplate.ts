
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { loadPDFTemplate, savePDFTemplate, DEFAULT_MODEL } from "@/utils/pdfTemplateUtils";
import { PDFTemplate } from "@/components/settings/PDFTemplateManager";

export const usePDFTemplate = (templateId: string = 'default') => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateExists, setTemplateExists] = useState(false);
  const [templateName, setTemplateName] = useState<string | undefined>(undefined);

  const loadTemplate = useCallback(async (id: string = 'default') => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Chargement du modèle PDF: ${id}`);
      const data = await loadPDFTemplate(id);
      
      if (!data) {
        console.log("Aucun modèle trouvé, utilisation du modèle par défaut");
        console.log("Modèle par défaut:", DEFAULT_MODEL);
        setTemplate({
          ...DEFAULT_MODEL,
          templateImages: [],
          fields: []
        });
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
        
        console.log("Modèle sanitisé:", sanitizedTemplate);
        console.log("Nombre d'images:", sanitizedTemplate.templateImages ? sanitizedTemplate.templateImages.length : 0);
        console.log("Nombre de champs:", sanitizedTemplate.fields ? sanitizedTemplate.fields.length : 0);
        
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
      setTemplate({
        ...DEFAULT_MODEL,
        templateImages: [],
        fields: []
      });
      setTemplateExists(false);
      setTemplateName("Modèle par défaut (fallback)");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTemplate = useCallback(async (updatedTemplate: PDFTemplate): Promise<void> => {
    setSaving(true);
    setError(null);
    
    try {
      console.log(`Sauvegarde du modèle: ${updatedTemplate.id}`, updatedTemplate);
      
      const sanitizedTemplate: PDFTemplate = {
        ...updatedTemplate,
        templateImages: Array.isArray(updatedTemplate.templateImages) ? updatedTemplate.templateImages : [],
        fields: Array.isArray(updatedTemplate.fields) ? updatedTemplate.fields : [],
        updated_at: new Date().toISOString()
      };
      
      console.log("Modèle à sauvegarder (sanitisé):", sanitizedTemplate);
      console.log("Nombre d'images à sauvegarder:", sanitizedTemplate.templateImages.length);
      console.log("Nombre de champs à sauvegarder:", sanitizedTemplate.fields.length);
      
      await savePDFTemplate(sanitizedTemplate);
      
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
