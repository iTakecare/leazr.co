
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PDFTemplateErrorProps {
  error: string | null;
  onRetry: () => void;
}

const PDFTemplateError: React.FC<PDFTemplateErrorProps> = ({ error, onRetry }) => {
  const navigate = useNavigate();
  
  if (!error) return null;
  
  const isAuthError = error.includes("connecté pour accéder");
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erreur</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{error}</p>
        <div className="flex gap-2">
          {isAuthError ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/login')}
            >
              Se connecter
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
            >
              Réessayer
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default PDFTemplateError;
