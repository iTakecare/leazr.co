
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PDFTemplateControls from "./pdf-template/PDFTemplateControls";
import PDFTemplateContent from "./pdf-template/PDFTemplateContent";
import { usePDFTemplate } from "@/hooks/usePDFTemplate";
import { useStorageConnection } from "@/hooks/useStorageConnection";

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
  const [activeTab, setActiveTab] = useState("company");
  
  const {
    loading,
    saving,
    template,
    error: templateError,
    templateExists,
    templateName,
    loadTemplate,
    saveTemplate
  } = usePDFTemplate(templateId);

  const handleLoadTemplate = async () => {
    await loadTemplate(templateId);
  };

  const { 
    error: connectionError, 
    reconnecting, 
    initializeStorage, 
    retryConnection 
  } = useStorageConnection(handleLoadTemplate);

  // Combine errors
  const error = connectionError || templateError;
  
  useEffect(() => {
    console.log(`Initialisation du gestionnaire pour le modèle: ${templateId}`);
    initializeStorage();
  }, [templateId, initializeStorage]);

  const handleCompanyInfoUpdate = async (companyInfo: Partial<PDFTemplate>): Promise<void> => {
    if (template) {
      const updatedTemplate = {
        ...template,
        ...companyInfo
      };
      
      return saveTemplate(updatedTemplate);
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
    
    return saveTemplate(sanitizedTemplate);
  };
  
  const handleRetry = () => {
    initializeStorage();
  };

  const handleSaveAction = async () => {
    if (template) {
      await saveTemplate(template);
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
          onRefresh={retryConnection}
          hasTemplate={!!template}
        />
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <div className="text-destructive mb-4">{error}</div>
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <PDFTemplateContent
            loading={loading}
            error={error}
            template={template}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onCompanyInfoUpdate={handleCompanyInfoUpdate}
            onTemplateUpdate={handleTemplateUpdate}
            saving={saving}
            onRetry={handleRetry}
            isNewTemplate={false}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default PDFTemplateManager;
