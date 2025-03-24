
import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";

interface OffersErrorProps {
  message: string;
  onRetry: () => void;
  debugInfo?: string | null;
}

const OffersError = ({ message, onRetry, debugInfo }: OffersErrorProps) => {
  return (
    <PageTransition>
      <Container>
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-3 max-w-md w-full">
            <div className="rounded-full bg-red-100 p-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-base font-medium text-center">{message}</p>
            
            {debugInfo && (
              <div className="w-full mt-4 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto max-h-40 whitespace-pre-wrap">
                <p className="font-bold mb-1">Informations de débogage:</p>
                {debugInfo}
              </div>
            )}
            
            <Button onClick={onRetry} size="sm" className="mt-4">
              Réessayer
            </Button>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default OffersError;
