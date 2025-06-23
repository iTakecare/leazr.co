
import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Pencil, 
  SendHorizontal, 
  CheckCircle, 
  X, 
  Sparkle, 
  Building, 
  Star, 
  HelpCircle 
} from "lucide-react";

export const OFFER_STATUSES = {
  DRAFT: { id: "draft", label: "Brouillon", icon: Pencil },
  SENT: { id: "sent", label: "Envoyée", icon: SendHorizontal },
  APPROVED: { id: "approved", label: "Approuvée client", icon: CheckCircle },
  REJECTED: { id: "rejected", label: "Rejetée", icon: X },
  INFO_REQUESTED: { id: "info_requested", label: "Infos demandées", icon: HelpCircle },
  VALID_ITC: { id: "valid_itc", label: "Validée ITC", icon: Sparkle },
  LEASER_REVIEW: { id: "leaser_review", label: "Évaluation Bailleur", icon: Building },
  FINANCED: { id: "financed", label: "Financée", icon: Star },
  SIGNED: { id: "signed", label: "Signée", icon: CheckCircle },
};

export interface OfferStatusBadgeProps {
  status: string;
  showIcon?: boolean;
  className?: string;
  isConverted?: boolean;
}

const OfferStatusBadge: React.FC<OfferStatusBadgeProps> = ({ 
  status, 
  showIcon = true,
  className = "",
  isConverted = false
}) => {
  // Fonction pour déterminer le style du badge en fonction du statut
  const getBadgeStyle = () => {
    if (isConverted) {
      return "bg-green-50 text-green-700 border-green-200 hover:bg-green-50";
    }
    
    switch (status) {
      case OFFER_STATUSES.DRAFT.id:
      case "draft":
        return "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100";
      case OFFER_STATUSES.SENT.id:
      case "sent":
        return "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50";
      case OFFER_STATUSES.APPROVED.id:
      case "approved":
        return "bg-green-50 text-green-700 border-green-200 hover:bg-green-50";
      case OFFER_STATUSES.REJECTED.id:
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-50";
      case OFFER_STATUSES.INFO_REQUESTED.id:
      case "info_requested":
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50";
      case OFFER_STATUSES.VALID_ITC.id:
      case "valid_itc":
        return "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50";
      case OFFER_STATUSES.LEASER_REVIEW.id:
      case "leaser_review":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50";
      case OFFER_STATUSES.FINANCED.id:
      case "financed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50";
      case OFFER_STATUSES.SIGNED.id:
      case "signed":
        return "bg-green-50 text-green-700 border-green-200 hover:bg-green-50";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100";
    }
  };

  // Obtenir le statut correspondant ou utiliser un statut par défaut
  const getStatusInfo = () => {
    // Handle null, undefined, or empty status
    if (!status) {
      return {
        id: "draft",
        label: "Brouillon",
        icon: Pencil
      };
    }

    // Find the status in our predefined statuses
    const statusObj = Object.values(OFFER_STATUSES).find(s => s.id === status);
    
    if (statusObj) {
      return statusObj;
    }

    // Handle legacy or direct string statuses
    switch (status) {
      case "draft":
      case null:
      case undefined:
      case "":
        return OFFER_STATUSES.DRAFT;
      case "sent":
        return OFFER_STATUSES.SENT;
      case "approved":
        return OFFER_STATUSES.APPROVED;
      case "rejected":
        return OFFER_STATUSES.REJECTED;
      case "info_requested":
        return OFFER_STATUSES.INFO_REQUESTED;
      case "valid_itc":
        return OFFER_STATUSES.VALID_ITC;
      case "leaser_review":
        return OFFER_STATUSES.LEASER_REVIEW;
      case "financed":
        return OFFER_STATUSES.FINANCED;
      case "signed":
        return OFFER_STATUSES.SIGNED;
      default:
        // For unknown statuses, default to draft
        console.warn(`Unknown offer status: ${status}, defaulting to draft`);
        return OFFER_STATUSES.DRAFT;
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Badge variant="outline" className={`${getBadgeStyle()} ${className}`}>
      {showIcon && <StatusIcon className="mr-1 h-3 w-3" />}
      {isConverted ? "Convertie" : statusInfo.label}
    </Badge>
  );
};

export default OfferStatusBadge;
