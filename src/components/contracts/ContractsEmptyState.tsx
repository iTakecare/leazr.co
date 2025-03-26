
import React from 'react';
import { FileText } from 'lucide-react';

const ContractsEmptyState: React.FC = () => {
  return (
    <div className="text-center py-16">
      <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Aucun contrat trouvé</h2>
      <p className="text-muted-foreground mb-6">
        Vous n'avez pas encore de contrats actifs.
      </p>
      <p className="text-sm text-muted-foreground">
        Les contrats seront créés automatiquement lorsque vos offres seront approuvées par le bailleur.
      </p>
    </div>
  );
};

export default ContractsEmptyState;
