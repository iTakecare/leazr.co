
import React from "react";
import { useNavigate } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ClientsErrorProps {
  errorMessage: string;
  onRetry: () => void;
}

const ClientsError = ({ errorMessage, onRetry }: ClientsErrorProps) => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <Container>
        <div className="py-12 flex flex-col items-center justify-center">
          <Alert variant="destructive" className="max-w-md mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          
          <div className="flex gap-4">
            <Button onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default ClientsError;
