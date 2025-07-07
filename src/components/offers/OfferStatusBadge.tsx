
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
  SENT: { id: "sent", label: "Offre envoyée", icon: SendHorizontal },
  INTERNAL_REVIEW: { id: "internal_review", label: "Analyse interne", icon: Sparkle },
  INTERNAL_APPROVED: { id: "internal_approved", label: "Validée interne (A)", icon: CheckCircle },
  INTERNAL_DOCS_REQUESTED: { id: "internal_docs_requested", label: "Docs demandés interne (B)", icon: HelpCircle },
  INTERNAL_REJECTED: { id: "internal_rejected", label: "Rejetée interne (C)", icon: X },
  LEASER_REVIEW: { id: "leaser_review", label: "Analyse Leaser", icon: Building },
  LEASER_APPROVED: { id: "leaser_approved", label: "Validée Leaser (A)", icon: CheckCircle },
  LEASER_DOCS_REQUESTED: { id: "leaser_docs_requested", label: "Docs demandés Leaser (B)", icon: HelpCircle },
  LEASER_REJECTED: { id: "leaser_rejected", label: "Rejetée Leaser (C)", icon: X },
  VALIDATED: { id: "validated", label: "Offre validée", icon: Star },
  APPROVED: { id: "approved", label: "Approuvée client", icon: CheckCircle },
  // Anciens statuts pour compatibilité
  REJECTED: { id: "rejected", label: "Rejetée", icon: X },
  INFO_REQUESTED: { id: "info_requested", label: "Infos demandées", icon: HelpCircle },
  VALID_ITC: { id: "valid_itc", label: "Validée ITC", icon: Sparkle },
  FINANCED: { id: "financed", label: "Financée", icon: Star },
};

export interface OfferStatusBadgeProps {
  status: string | null | undefined;
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
  // Normaliser le statut - si null/undefined, utiliser 'draft' par défaut
  const normalizedStatus = status || 'draft';
  
  // Fonction pour déterminer le style du badge en fonction du statut
  const getBadgeStyle = () => {
    if (isConverted) {
      return "bg-green-50 text-green-700 border-green-200 hover:bg-green-50";
    }
    
    switch (normalizedStatus) {
      case OFFER_STATUSES.DRAFT.id:
        return "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100";
      case OFFER_STATUSES.SENT.id:
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50";
      case OFFER_STATUSES.INTERNAL_REVIEW.id:
        return "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50";
      case OFFER_STATUSES.INTERNAL_APPROVED.id:
        return "bg-green-50 text-green-700 border-green-200 hover:bg-green-50";
      case OFFER_STATUSES.INTERNAL_DOCS_REQUESTED.id:
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50";
      case OFFER_STATUSES.INTERNAL_REJECTED.id:
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-50";
      case OFFER_STATUSES.LEASER_REVIEW.id:
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50";
      case OFFER_STATUSES.LEASER_APPROVED.id:
        return "bg-green-50 text-green-700 border-green-200 hover:bg-green-50";
      case OFFER_STATUSES.LEASER_DOCS_REQUESTED.id:
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50";
      case OFFER_STATUSES.LEASER_REJECTED.id:
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-50";
      case OFFER_STATUSES.VALIDATED.id:
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50";
      case OFFER_STATUSES.APPROVED.id:
        return "bg-green-50 text-green-700 border-green-200 hover:bg-green-50";
      // Anciens statuts pour compatibilité
      case OFFER_STATUSES.REJECTED.id:
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-50";
      case OFFER_STATUSES.INFO_REQUESTED.id:
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50";
      case OFFER_STATUSES.VALID_ITC.id:
        return "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50";
      case OFFER_STATUSES.FINANCED.id:
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100";
    }
  };

  // Fonction pour déterminer si l'offre est publiquement accessible
  const isPubliclyAccessible = () => {
    return ['sent', 'approved', 'internal_review', 'internal_approved', 'internal_docs_requested', 
            'leaser_review', 'leaser_approved', 'leaser_docs_requested', 'validated', 
            'info_requested', 'valid_itc', 'financed'].includes(normalizedStatus);
  };

  // Obtenir le statut correspondant ou utiliser un statut par défaut
  const statusObj = Object.values(OFFER_STATUSES).find(s => s.id === normalizedStatus) || {
    id: normalizedStatus,
    label: normalizedStatus === 'draft' ? 'Brouillon' : normalizedStatus,
    icon: normalizedStatus === 'draft' ? Pencil : HelpCircle
  };

  const StatusIcon = statusObj.icon;

  return (
    <Badge variant="outline" className={`${getBadgeStyle()} ${className}`}>
      {showIcon && <StatusIcon className="mr-1 h-3 w-3" />}
      {isConverted ? "Convertie" : statusObj.label}
      {isPubliclyAccessible() && (
        <span className="ml-1 text-xs" title="Accessible publiquement">🔗</span>
      )}
    </Badge>
  );
};

export default OfferStatusBadge;
