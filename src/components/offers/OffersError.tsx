
import React from "react";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";

interface OffersErrorProps {
  message: string;
  onRetry: () => void;
  debugInfo?: string;
}

const OffersError = ({ message, onRetry, debugInfo }: OffersErrorProps) => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id') || window.location.pathname.split('/').pop();

  return (
    <PageTransition>
      <Container>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="max-w-md w-full">
            <div className="flex flex-col items-center space-y-4 text-center mb-6">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold">Offre non disponible</h1>
              <p className="text-base text-gray-600">{message}</p>
            </div>

            {debugInfo && (
              <div className="mb-6 p-4 bg-gray-100 rounded text-xs text-gray-700 whitespace-pre-wrap">
                <p className="font-bold mb-1">Informations de débogage:</p>
                {debugInfo}
              </div>
            )}
            
            {id && (
              <div className="mb-6 p-4 bg-red-50 rounded-md border border-red-200">
                <h3 className="text-sm font-medium text-red-800">ID d'offre recherché:</h3>
                <p className="mt-1 text-xs break-all">{id}</p>
              </div>
            )}

            <div className="flex justify-center space-x-3">
              <Button onClick={() => window.location.href = "/"} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Button>
              
              <Button 
                onClick={onRetry}
                className="flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default OffersError;
