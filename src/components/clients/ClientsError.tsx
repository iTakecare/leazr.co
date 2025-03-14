
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Link } from "react-router-dom";

interface ClientsErrorProps {
  errorMessage: string;
  onRetry?: () => void;
}

const ClientsError = ({ errorMessage, onRetry }: ClientsErrorProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Alert className="my-8 border-red-300 bg-red-50 dark:bg-red-950/20">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <AlertDescription className="mt-2 text-lg font-medium text-red-500">{errorMessage}</AlertDescription>
      </Alert>
      
      <div className="flex gap-4 mt-6 justify-center">
        {onRetry && (
          <Button 
            onClick={onRetry}
            className="flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            Réessayer
          </Button>
        )}
        
        <Button variant="outline" asChild>
          <Link to="/">
            Retour à l'accueil
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ClientsError;
