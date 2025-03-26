
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFTemplateErrorProps {
  error: string | null;
  onRetry: () => void;
}

const PDFTemplateError: React.FC<PDFTemplateErrorProps> = ({ error, onRetry }) => {
  if (!error) return null;
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="self-start" 
          onClick={onRetry}
        >
          Réessayer
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default PDFTemplateError;
