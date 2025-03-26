
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PDFCompanyInfo from "../PDFCompanyInfo";
import NewPDFTemplateEditor from "../NewPDFTemplateEditor";
import SimplePDFPreview from "../SimplePDFPreview";
import PDFTemplateWithFields from "../PDFTemplateWithFields";
import PDFPreview from "../PDFPreview";
import { PDFTemplate } from "@/utils/templateManager";

interface PDFTemplateTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  template: PDFTemplate;
  onCompanyInfoUpdate: (companyInfo: Partial<PDFTemplate>) => void;
  onTemplateUpdate: (template: PDFTemplate) => Promise<void>;
  saving: boolean;
  isNewTemplate?: boolean;
}

const PDFTemplateTabs: React.FC<PDFTemplateTabsProps> = ({
  activeTab,
  setActiveTab,
  template,
  onCompanyInfoUpdate,
  onTemplateUpdate,
  saving,
  isNewTemplate = false
}) => {
  if (!template) return null;

  // Create Promise-returning wrappers for the update functions to ensure type compatibility
  const handleTemplateUpdate = async (updatedTemplate: PDFTemplate): Promise<void> => {
    return onTemplateUpdate(updatedTemplate);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="company">Informations de l'entreprise</TabsTrigger>
        <TabsTrigger value="design">Conception du modèle</TabsTrigger>
        <TabsTrigger value="preview">Aperçu</TabsTrigger>
      </TabsList>
      
      <TabsContent value="company" className="mt-6">
        <PDFCompanyInfo 
          template={template} 
          onSave={onCompanyInfoUpdate} 
          loading={saving}
        />
      </TabsContent>
      
      <TabsContent value="design" className="mt-6">
        {isNewTemplate ? (
          <NewPDFTemplateEditor
            template={template}
            onSave={onTemplateUpdate}
          />
        ) : (
          <PDFTemplateWithFields 
            template={template}
            onSave={onTemplateUpdate}
          />
        )}
      </TabsContent>
      
      <TabsContent value="preview" className="mt-6">
        {isNewTemplate ? (
          <SimplePDFPreview 
            template={template}
            onSave={handleTemplateUpdate}
          />
        ) : (
          <PDFPreview 
            template={template}
          />
        )}
      </TabsContent>
    </Tabs>
  );
};

export default PDFTemplateTabs;
