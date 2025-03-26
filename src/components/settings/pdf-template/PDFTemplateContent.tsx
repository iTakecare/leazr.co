
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import PDFTemplateError from "./PDFTemplateError";
import PDFTemplateLoading from "./PDFTemplateLoading";
import PDFTemplateTabs from "./PDFTemplateTabs";
import { PDFTemplate } from "@/components/settings/PDFTemplateManager";

interface PDFTemplateContentProps {
  loading: boolean;
  error: string | null;
  template: PDFTemplate | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onCompanyInfoUpdate: (companyInfo: Partial<PDFTemplate>) => void;
  onTemplateUpdate: (template: PDFTemplate) => Promise<void>;
  saving: boolean;
  onRetry: () => void;
  isNewTemplate?: boolean;
}

const PDFTemplateContent: React.FC<PDFTemplateContentProps> = ({
  loading,
  error,
  template,
  activeTab,
  setActiveTab,
  onCompanyInfoUpdate,
  onTemplateUpdate,
  saving,
  onRetry,
  isNewTemplate = false
}) => {
  return (
    <>
      <PDFTemplateError error={error} onRetry={onRetry} />
      
      {loading ? (
        <PDFTemplateLoading />
      ) : template ? (
        <PDFTemplateTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          template={template}
          onCompanyInfoUpdate={onCompanyInfoUpdate}
          onTemplateUpdate={onTemplateUpdate}
          saving={saving}
          isNewTemplate={isNewTemplate}
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
    </>
  );
};

export default PDFTemplateContent;
