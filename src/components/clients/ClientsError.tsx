
import React from "react";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Link } from "react-router-dom";

interface ClientsErrorProps {
  errorMessage: string;
  onRetry?: () => void;
  email?: string | null;
  userId?: string | null;
}

const ClientsError = ({ errorMessage, onRetry, email }: ClientsErrorProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Alert className="my-8 border-red-300 bg-red-50 dark:bg-red-950/20">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <AlertDescription className="mt-2 text-lg font-medium text-red-500">{errorMessage}</AlertDescription>
        
        <div className="mt-4 text-sm text-red-500">
          {email && (
            <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 rounded">
              <p className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Email concerné: <span className="font-medium">{email}</span>
              </p>
            </div>
          )}
          <p>Une erreur s'est produite lors de la vérification de votre compte client.</p>
          <p>Si le problème persiste, contactez votre administrateur.</p>
        </div>
      </Alert>
      
      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {onRetry && (
          <Button 
            onClick={onRetry}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
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
