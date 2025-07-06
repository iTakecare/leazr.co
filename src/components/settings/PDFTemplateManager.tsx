
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PDFTemplateControls from "./pdf-template/PDFTemplateControls";
import PDFTemplateContent from "./pdf-template/PDFTemplateContent";
import { usePDFTemplate } from "@/hooks/usePDFTemplate";
import { PDFModel } from "@/utils/pdfModelUtils";
import { toast } from "sonner";

interface PDFTemplateManagerProps {
  templateId?: string;
}

const PDFTemplateManager: React.FC<PDFTemplateManagerProps> = ({ templateId = 'default' }) => {
  const [activeTab, setActiveTab] = useState("company");
  const [isInitialized, setIsInitialized] = useState(false);
  
  const {
    loading,
    saving,
    template,
    error,
    templateExists,
    templateName,
    loadTemplate,
    saveTemplate
  } = usePDFTemplate(templateId);

  // Charger le template une seule fois au montage
  useEffect(() => {
    if (!isInitialized) {
      console.log(`Chargement initial du modèle: ${templateId}`);
      loadTemplate(templateId);
      setIsInitialized(true);
    }
  }, [templateId, isInitialized, loadTemplate]);

  const handleCompanyInfoUpdate = async (companyInfo: Partial<PDFModel>): Promise<void> => {
    if (template) {
      const updatedTemplate = {
        ...template,
        ...companyInfo
      };
      
      return saveTemplate(updatedTemplate);
    }
  };
  
  const handleTemplateUpdate = async (updatedTemplate: PDFModel): Promise<void> => {
    console.log("handleTemplateUpdate appelé avec:", updatedTemplate);
    console.log("Nombre d'images dans updatedTemplate:", updatedTemplate.templateImages?.length || 0);
    console.log("Nombre de champs dans updatedTemplate:", updatedTemplate.fields?.length || 0);
    
    const sanitizedTemplate: PDFModel = {
      ...updatedTemplate,
      templateImages: Array.isArray(updatedTemplate.templateImages) ? updatedTemplate.templateImages : [],
      fields: Array.isArray(updatedTemplate.fields) ? updatedTemplate.fields : []
    };
    
    return saveTemplate(sanitizedTemplate);
  };
  
  const handleRetry = useCallback(() => {
    setIsInitialized(false);
    toast.info("Rechargement du modèle...");
  }, []);

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
          saving={saving}
          loading={loading}
          onSave={handleSaveAction}
          onRefresh={handleRetry}
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
