import React from "react";
import { FileText } from "lucide-react";

interface ContractsEmptyStateProps {
  activeFilter: string;
}

const ContractsEmptyState = ({ activeFilter }: ContractsEmptyStateProps) => {
  const messages: Record<string, { title: string; description: string }> = {
    all: {
      title: "Aucun contrat trouvé",
      description: "Aucun contrat ne correspond à votre recherche."
    },
    in_progress: {
      title: "Aucun contrat en cours",
      description: "Vous n'avez pas de contrats en attente d'activation."
    },
    contract_signed: {
      title: "Aucun contrat signé",
      description: "Vous n'avez pas de contrats récemment signés."
    },
    active: {
      title: "Aucun contrat actif",
      description: "Vous n'avez pas de contrats actuellement actifs."
    },
    expiring_soon: {
      title: "Aucun contrat en expiration prochaine",
      description: "Vous n'avez pas de contrats qui arrivent à échéance dans les 3 prochains mois."
    }
  };

  const message = messages[activeFilter] || messages.all;

  return (
    <div className="text-center py-16 border-2 border-dashed rounded-lg border-muted">
      <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{message.title}</h2>
      <p className="text-muted-foreground">{message.description}</p>
    </div>
  );
};

export default ContractsEmptyState;
