
import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PackComparisonProps {
  packs: Record<string, any>;
  selectedPack: string;
  onSelect: (packId: string) => void;
}

const PackComparison: React.FC<PackComparisonProps> = ({ packs, selectedPack, onSelect }) => {
  const packIds = Object.keys(packs);

  // Définir les sections et leurs caractéristiques
  const sections = [
    {
      title: "SERVICES DE BASE",
      features: [
        { id: "dashboard", label: "Dashboard iTakecare" },
        { id: "insurance", label: "Assurance" },
        { id: "replacement", label: "Remplacement en cas de panne sous 24h" },
        { id: "deviceReplacement", label: "Changement matériel" },
      ],
    },
    {
      title: "SUPPORT",
      features: [
        { id: "supportHours", label: "Heures de support" },
        { id: "support", label: "Support technique" },
        { id: "supportValue", label: "Valeur discount" },
      ],
    },
    {
      title: "SÉCURITÉ",
      features: [
        { id: "backupRetention", label: "Sauvegarde externe Microsoft 365" },
        { id: "authentication", label: "Authentication sécurisée" },
        { id: "phishingAwareness", label: "Formation anti-hameçonnage" },
        { id: "passwordManager", label: "Gestionnaire de mots de passe avec MFA" },
        { id: "externalBackup", label: "Sauvegarde externe des ordinateurs" },
        { id: "incidentResponse", label: "Réponse aux incidents 24/7" },
      ],
    },
  ];

  const renderValue = (pack: any, featureId: string) => {
    const value = pack.features[featureId];
    
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-5 w-5 text-green-600 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-gray-300 mx-auto" />
      );
    }
    
    if (featureId === "supportValue" && typeof value === "number") {
      return value > 0 ? value : "-";
    }
    
    return value;
  };

  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-64">Fonctionnalités</TableHead>
            {packIds.map((packId) => (
              <TableHead key={packId} className={`text-center ${packId === selectedPack ? "bg-blue-50" : ""}`}>
                <div>
                  <div className="font-bold">{packs[packId].name}</div>
                  <div className={`w-full h-1 ${packs[packId].color} my-1`}></div>
                  <div className="text-lg font-bold">{packs[packId].monthlyPrice}€</div>
                  <div className="text-xs text-gray-500">par mois</div>
                  <Button
                    variant={packId === selectedPack ? "default" : "outline"}
                    size="sm"
                    className="mt-2"
                    onClick={() => onSelect(packId)}
                  >
                    {packId === selectedPack ? "Sélectionné" : "Sélectionner"}
                  </Button>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((section) => (
            <React.Fragment key={section.title}>
              <TableRow className="bg-gray-100">
                <TableCell colSpan={packIds.length + 1} className="font-bold">
                  {section.title}
                </TableCell>
              </TableRow>
              {section.features.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell className="font-medium">{feature.label}</TableCell>
                  {packIds.map((packId) => (
                    <TableCell key={packId} className={`text-center ${packId === selectedPack ? "bg-blue-50" : ""}`}>
                      {renderValue(packs[packId], feature.id)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </React.Fragment>
          ))}
          <TableRow className="bg-yellow-50">
            <TableCell className="font-bold">VALEUR PACK REMISÉE</TableCell>
            {packIds.map((packId) => (
              <TableCell key={packId} className={`text-center font-bold ${packId === selectedPack ? "bg-blue-50" : ""}`}>
                {packs[packId].price}€
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default PackComparison;
