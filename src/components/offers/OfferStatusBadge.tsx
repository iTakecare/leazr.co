
import React from "react";
import { Badge } from "@/components/ui/badge";
import { workflowStatuses } from "@/hooks/useOffers";
import { cn } from "@/lib/utils";

interface OfferStatusBadgeProps {
  status: string;
  isConverted?: boolean;
}

const OfferStatusBadge: React.FC<OfferStatusBadgeProps> = ({ 
  status,
  isConverted = false
}) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let badgeText = "Inconnu";
  
  // Ajout d'une vérification pour éviter que le status soit l'ID de l'offre 
  const isStatusValid = Object.values(workflowStatuses).includes(status);
  const safeStatus = isStatusValid ? status : "draft";
  
  switch (safeStatus) {
    case workflowStatuses.DRAFT:
      variant = "outline";
      badgeText = "Brouillon";
      break;
    case workflowStatuses.CLIENT_WAITING:
      variant = "secondary";
      badgeText = "En attente client";
      break;
    case workflowStatuses.CLIENT_APPROVED:
      variant = "default";
      badgeText = "Approuvé par client";
      break;
    case workflowStatuses.CLIENT_NO_RESPONSE:
      variant = "destructive";
      badgeText = "Sans réponse client";
      break;
    case workflowStatuses.INTERNAL_REVIEW:
      variant = "secondary";
      badgeText = "Revue interne";
      break;
    case workflowStatuses.NEED_INFO:
      variant = "outline";
      badgeText = "Infos supplémentaires";
      break;
    case workflowStatuses.INTERNAL_REJECTED:
      variant = "destructive";
      badgeText = "Rejeté en interne";
      break;
    case workflowStatuses.LEASER_SENT:
      variant = "secondary";
      badgeText = "Envoyé au bailleur";
      break;
    case workflowStatuses.LEASER_REVIEW:
      variant = "secondary";
      badgeText = "Revue bailleur";
      break;
    case workflowStatuses.LEASER_APPROVED:
      variant = "default";
      badgeText = "Approuvé par bailleur";
      break;
    case workflowStatuses.LEASER_REJECTED:
      variant = "destructive";
      badgeText = "Rejeté par bailleur";
      break;
    default:
      variant = "outline";
      badgeText = "Statut inconnu";
  }
  
  return (
    <div className="flex items-center gap-1">
      <Badge 
        variant={variant}
        className={cn(
          isConverted && "opacity-70"
        )}
      >
        {badgeText}
      </Badge>
      
      {isConverted && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Contrat créé
        </Badge>
      )}
    </div>
  );
};

export default OfferStatusBadge;
