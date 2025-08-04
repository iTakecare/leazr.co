
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, FileText, Library, BarChart3, Users } from "lucide-react";
import PDFTemplateControls from "./pdf-template/PDFTemplateControls";
import PDFTemplateContent from "./pdf-template/PDFTemplateContent";
import { usePDFTemplate } from "@/hooks/usePDFTemplate";
import { PDFModel } from "@/utils/pdfModelUtils";
import { AdvancedTemplateManager } from "@/components/custom-templates/AdvancedTemplateManager";
import { toast } from "sonner";

interface PDFTemplateManagerProps {
  templateId?: string;
}

const PDFTemplateManager: React.FC<PDFTemplateManagerProps> = ({ templateId = 'default' }) => {
  const [activeTab, setActiveTab] = useState("company");
  const [isInitialized, setIsInitialized] = useState(false);
  const [mainTab, setMainTab] = useState("classic");
  
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
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gestion des Templates PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="classic" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration Classique
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Gestion Avancée
              </TabsTrigger>
            </TabsList>

            <TabsContent value="classic" className="space-y-6">
              <Card>
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
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <AdvancedTemplateManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFTemplateManager;
