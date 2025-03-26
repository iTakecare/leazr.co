
import React from "react";
import { Loader2 } from "lucide-react";

const PDFTemplateLoading: React.FC = () => {
  return (
    <div className="text-center py-8">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
      <p className="text-sm text-muted-foreground">
        Chargement du modèle...
      </p>
    </div>
  );
};

export default PDFTemplateLoading;
