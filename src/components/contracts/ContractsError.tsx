
import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface ContractsErrorProps {
  error: string;
  onRetry: () => void;
}

const ContractsError: React.FC<ContractsErrorProps> = ({ error, onRetry }) => {
  return (
    <div className="py-8">
      <div className="text-center">
        <div className="mb-4 text-red-500">
          <FileText className="h-12 w-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={onRetry}>Réessayer</Button>
      </div>
    </div>
  );
};

export default ContractsError;
