
import React from "react";
import { Check, X } from "lucide-react";

interface PackFeatureListProps {
  pack: {
    id: string;
    features: {
      [key: string]: any;
    };
  };
}

const PackFeatureList: React.FC<PackFeatureListProps> = ({ pack }) => {
  // Définir les fonctionnalités à afficher avec leurs labels
  const featureGroups = [
    {
      title: "Services de base",
      features: [
        { id: "dashboard", label: "Dashboard iTakecare" },
        { id: "insurance", label: "Assurance" },
        { id: "replacement", label: "Remplacement sous 24h" },
        { id: "deviceReplacement", label: "Renouvellement matériel" },
      ],
    },
    {
      title: "Support",
      features: [
        { id: "supportHours", label: "Disponibilité" },
        { id: "support", label: "Support technique" },
      ],
    },
    {
      title: "Sécurité",
      features: [
        { id: "backupRetention", label: "Sauvegarde Microsoft 365" },
        { id: "authentication", label: "Authentication sécurisée" },
        { id: "phishingAwareness", label: "Protection anti-hameçonnage" },
        { id: "passwordManager", label: "Gestionnaire de mots de passe" },
        { id: "externalBackup", label: "Sauvegarde des ordinateurs" },
        { id: "incidentResponse", label: "Réponse aux incidents 24/7" },
      ],
    },
  ];

  const renderFeatureValue = (featureId: string) => {
    if (!pack || !pack.features) {
      return <X className="h-5 w-5 text-gray-300" />;
    }
    
    const value = pack.features[featureId];
    
    if (value === true) {
      return <Check className="h-5 w-5 text-green-600" />;
    }
    
    if (value === false) {
      return <X className="h-5 w-5 text-gray-300" />;
    }
    
    return <span className="text-sm text-gray-800">{value}</span>;
  };

  if (!pack || !pack.features) {
    return (
      <div className="p-4 text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
        Aucune information disponible pour ce pack.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {featureGroups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h4 className="font-medium text-gray-700">{group.title}</h4>
          <div className="space-y-2">
            {group.features.map((feature) => (
              <div key={feature.id} className="flex items-center justify-between border-b pb-2">
                <span className="text-sm">{feature.label}</span>
                <div>{renderFeatureValue(feature.id)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PackFeatureList;
