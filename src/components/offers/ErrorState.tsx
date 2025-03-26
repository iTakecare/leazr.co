
import React from "react";
import { AlertCircle } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: string;
  debugInfo?: string | null;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, debugInfo }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-2" />
            <CardTitle>Offre non disponible</CardTitle>
            <CardDescription>
              {error || "Cette offre n'existe pas ou n'est plus disponible."}
            </CardDescription>
          </CardHeader>
          {debugInfo && (
            <CardContent>
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-700 whitespace-pre-wrap">
                <p className="font-bold mb-1">Informations de débogage:</p>
                {debugInfo}
              </div>
            </CardContent>
          )}
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.href = "/"}>
              Retour à l'accueil
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ErrorState;
