
import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2, RefreshCw } from "lucide-react";

interface PDFTemplateControlsProps {
  saving: boolean;
  loading: boolean;
  onSave: () => void;
  onRefresh: () => void;
  hasTemplate: boolean;
}

const PDFTemplateControls: React.FC<PDFTemplateControlsProps> = ({
  saving,
  loading,
  onSave,
  onRefresh,
  hasTemplate
}) => {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Rafraîchir
      </Button>
      <Button 
        variant="default" 
        size="sm" 
        onClick={onSave}
        disabled={saving || loading || !hasTemplate}
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
  );
};

export default PDFTemplateControls;
