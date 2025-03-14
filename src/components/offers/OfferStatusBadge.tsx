
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, FileText, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_STAGES } from "./OfferWorkflowSimple";

interface OfferStatusBadgeProps {
  status?: string;
  isConverted?: boolean;
}

const OfferStatusBadge: React.FC<OfferStatusBadgeProps> = ({ 
  status = 'draft', 
  isConverted = false 
}) => {
  // Si l'offre est convertie en contrat, on affiche un badge spécial
  if (isConverted) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900">
        <Check className="h-3 w-3 mr-1" />
        Convertie en contrat
      </Badge>
    );
  }

  // Récupérer les informations du statut
  const stageInfo = Object.values(WORKFLOW_STAGES).find(stage => stage.id === status) || WORKFLOW_STAGES.DRAFT;
  const Icon = stageInfo.icon;

  return (
    <Badge className={cn(
      stageInfo.color,
      stageInfo.textColor,
      "hover:bg-opacity-80"
    )}>
      <Icon className="h-3 w-3 mr-1" />
      {stageInfo.label}
    </Badge>
  );
};

export default OfferStatusBadge;
