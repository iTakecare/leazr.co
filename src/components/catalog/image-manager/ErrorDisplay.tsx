
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  errorMessage: string;
  handleRetry: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errorMessage, handleRetry }) => {
  return (
    <div className="p-6 border border-red-300 bg-red-50 rounded-md">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="text-red-500 h-5 w-5" />
        <h3 className="font-medium">Erreur d'accès au stockage</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {errorMessage}
      </p>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRetry}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            const url = `https://supabase.com/dashboard/project/cifbetjefyfocafanlhv/storage/buckets`;
            window.open(url, '_blank');
          }}
        >
          Vérifier les buckets de stockage
        </Button>
      </div>
    </div>
  );
};

export default ErrorDisplay;
