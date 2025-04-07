
import React from "react";
import { Check, X, HelpCircle } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger, 
} from "@/components/ui/tooltip";

type PackTier = {
  id: string;
  name: string;
  color: string;
  price: number;
  monthlyPrice: number;
  features: {
    [key: string]: boolean | string | number;
  };
};

type PackFeatureListProps = {
  pack: PackTier;
};

const PackFeatureList = ({ pack }: PackFeatureListProps) => {
  const featureLabels: Record<string, string> = {
    dashboard: "Tableau de bord client",
    insurance: "Assurance matériel",
    support: "Support technique",
    assistance: "Assistance à distance",
    replacement: "Remplacement matériel",
    deviceReplacement: "Nombre de remplacements",
    supportHours: "Horaires du support",
    supportValue: "Valeur du support",
    backupRetention: "Rétention des sauvegardes",
    authentication: "Niveau d'authentification",
    phishingAwareness: "Formation anti-phishing",
    passwordManager: "Gestionnaire de mots de passe",
    externalBackup: "Sauvegarde externe",
    incidentResponse: "Réponse aux incidents",
  };

  const renderFeatureValue = (key: string, value: boolean | string | number) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-5 w-5 text-green-600" />
      ) : (
        <X className="h-5 w-5 text-red-500" />
      );
    }

    if (key === "supportValue" && typeof value === "number" && value > 0) {
      return <span className="text-green-600 font-medium">{value}€</span>;
    }

    return <span className="text-gray-800">{value}</span>;
  };

  return (
    <div className="space-y-3">
      {Object.entries(pack.features).map(([key, value]) => (
        <div key={key} className="flex justify-between items-center py-1 border-b border-gray-100">
          <div className="flex items-center">
            <span className="text-gray-700">{featureLabels[key] || key}</span>
            {key === "supportHours" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 ml-1 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px]">
                      Les horaires du support technique disponible.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div>{renderFeatureValue(key, value)}</div>
        </div>
      ))}
    </div>
  );
};

export default PackFeatureList;
