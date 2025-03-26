import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { loadPDFTemplate, savePDFTemplate, DEFAULT_MODEL } from "@/utils/pdfTemplateUtils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { checkStorageConnection, resetStorageConnection } from "@/services/fileStorage";
import PDFTemplateControls from "./pdf-template/PDFTemplateControls";
import PDFTemplateError from "./pdf-template/PDFTemplateError";
import PDFTemplateLoading from "./pdf-template/PDFTemplateLoading";
import PDFTemplateTabs from "./pdf-template/PDFTemplateTabs";

// Interface pour le modèle PDF
export interface PDFTemplate {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companySiret: string;
  logoURL: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  templateImages: any[];
  fields: any[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

interface PDFTemplateManagerProps {
  templateId?: string;
}

const PDFTemplateManager: React.FC<PDFTemplateManagerProps> = ({ templateId = 'default' }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("company");
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [templateExists, setTemplateExists] = useState(false);
  const [templateName, setTemplateName] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    console.log(`Initialisation du gestionnaire pour le modèle: ${templateId}`);
    initializeStorage();
  }, [templateId]);

  const initializeStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      try {
        const isConnected = await checkStorageConnection();
        if (isConnected) {
          console.log("Connexion au stockage Supabase établie");
          toast.success("Connexion au stockage Supabase établie");
        } else {
          console.log("Stockage Supabase non disponible");
          setError("Connexion au stockage Supabase impossible. Veuillez réessayer.");
          toast.error("Connexion au stockage Supabase impossible.");
          setLoading(false);
          return;
        }
      } catch (storageError) {
        console.error("Erreur avec le stockage:", storageError);
        setError("Erreur lors de la connexion au stockage Supabase.");
        toast.error("Erreur lors de la connexion au stockage Supabase.");
        setLoading(false);
        return;
      }
      
      await loadTemplate(templateId);
    } catch (err) {
      console.error("Erreur lors de l'initialisation:", err);
      setError("Erreur lors de l'initialisation du gestionnaire");
      setLoading(false);
    }
  };

  const handleRetryConnection = async () => {
    try {
      setReconnecting(true);
      setError(null);
      
      toast.info("Tentative de connexion au stockage Supabase...");
      
      const isConnected = await resetStorageConnection();
      
      if (isConnected) {
        console.log("Connexion au stockage Supabase établie");
        toast.success("Connexion au stockage Supabase établie");
        
        await loadTemplate(templateId);
      } else {
        console.log("Stockage Supabase non disponible");
        setError("Connexion au stockage Supabase impossible. Veuillez réessayer.");
        toast.error("Connexion au stockage Supabase impossible.");
      }
    } catch (err) {
      console.error("Erreur lors de la tentative de connexion:", err);
      setError("Erreur lors de la tentative de connexion au stockage Supabase.");
      toast.error("Erreur lors de la tentative de connexion au stockage Supabase.");
    } finally {
      setReconnecting(false);
    }
  };

  const loadTemplate = async (id: string = 'default') => {
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
      setError("Erreur lors du chargement du modèle");
      toast.error("Erreur lors du chargement du modèle");
      
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
  };
  
  const handleSaveTemplate = async (updatedTemplate: PDFTemplate): Promise<void> => {
    setSaving(true);
    setError(null);
    
    try {
      console.log(`Sauvegarde du modèle: ${updatedTemplate.id}`, updatedTemplate);
      
      const isConnected = await checkStorageConnection();
      if (!isConnected) {
        throw new Error("Stockage Supabase non disponible. Veuillez vérifier votre connexion.");
      }
      
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
    } finally {
      setSaving(false);
    }
  };
  
  const handleCompanyInfoUpdate = (companyInfo: Partial<PDFTemplate>): void => {
    if (template) {
      const updatedTemplate = {
        ...template,
        ...companyInfo
      };
      
      handleSaveTemplate(updatedTemplate);
    }
  };
  
  const handleTemplateUpdate = async (updatedTemplate: PDFTemplate): Promise<void> => {
    console.log("handleTemplateUpdate appelé avec:", updatedTemplate);
    console.log("Nombre d'images dans updatedTemplate:", updatedTemplate.templateImages?.length || 0);
    console.log("Nombre de champs dans updatedTemplate:", updatedTemplate.fields?.length || 0);
    
    const sanitizedTemplate: PDFTemplate = {
      ...updatedTemplate,
      templateImages: Array.isArray(updatedTemplate.templateImages) ? updatedTemplate.templateImages : [],
      fields: Array.isArray(updatedTemplate.fields) ? updatedTemplate.fields : []
    };
    
    return handleSaveTemplate(sanitizedTemplate);
  };
  
  const handleRetry = () => {
    initializeStorage();
  };

  const handleSaveAction = () => {
    if (template) {
      handleSaveTemplate(template);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>
            {loading 
              ? "Chargement du modèle..." 
              : `Modèle: ${templateName || 'Non défini'}`}
          </CardTitle>
        </div>
        <PDFTemplateControls
          saving={saving || reconnecting}
          loading={loading}
          onSave={handleSaveAction}
          onRefresh={handleRetryConnection}
          hasTemplate={!!template}
        />
      </CardHeader>
      <CardContent>
        <PDFTemplateError error={error} onRetry={handleRetry} />
        
        {loading ? (
          <PDFTemplateLoading />
        ) : template ? (
          <PDFTemplateTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            template={template}
            onCompanyInfoUpdate={handleCompanyInfoUpdate}
            onTemplateUpdate={handleTemplateUpdate}
            saving={saving}
            isNewTemplate={false}
          />
        ) : (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Aucun modèle disponible</AlertTitle>
            <AlertDescription>
              Impossible de charger le modèle. Veuillez vérifier la connexion au stockage Supabase.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFTemplateManager;
