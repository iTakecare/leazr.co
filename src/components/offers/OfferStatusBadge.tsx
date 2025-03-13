
import React from "react";
import { Check, Clock, X, FileText, UserCog, MessagesSquare, RefreshCw, SendToBack } from "lucide-react";
import { cn } from "@/lib/utils";
import { workflowStatuses } from "@/hooks/useOffers";

interface OfferStatusBadgeProps {
  status: string;
  className?: string;
}

const OfferStatusBadge = ({ status, className }: OfferStatusBadgeProps) => {
  // Style et icône basés sur le statut
  const getStatusConfig = () => {
    switch (status) {
      case "accepted":
      case workflowStatuses.CLIENT_APPROVED:
      case workflowStatuses.LEASER_APPROVED:
        return {
          icon: Check,
          label: "Acceptée",
          bgColor: "bg-green-100",
          textColor: "text-green-800"
        };
      
      case "pending":
      case workflowStatuses.CLIENT_WAITING:
      case workflowStatuses.LEASER_REVIEW:
        return {
          icon: Clock,
          label: "En attente",
          bgColor: "bg-yellow-100",
          textColor: "text-yellow-800"
        };
      
      case "rejected":
      case workflowStatuses.CLIENT_NO_RESPONSE:
      case workflowStatuses.INTERNAL_REJECTED:
      case workflowStatuses.LEASER_REJECTED:
        return {
          icon: X,
          label: "Refusée",
          bgColor: "bg-red-100",
          textColor: "text-red-800"
        };
      
      case workflowStatuses.DRAFT:
        return {
          icon: FileText,
          label: "Brouillon",
          bgColor: "bg-blue-100",
          textColor: "text-blue-800"
        };
      
      case workflowStatuses.INTERNAL_REVIEW:
        return {
          icon: UserCog,
          label: "Revue interne",
          bgColor: "bg-purple-100",
          textColor: "text-purple-800"
        };
      
      case workflowStatuses.NEED_INFO:
        return {
          icon: MessagesSquare,
          label: "Informations",
          bgColor: "bg-orange-100",
          textColor: "text-orange-800"
        };
      
      case workflowStatuses.LEASER_SENT:
        return {
          icon: SendToBack,
          label: "Envoyé",
          bgColor: "bg-blue-100",
          textColor: "text-blue-800"
        };
      
      default:
        return {
          icon: Clock,
          label: status || "Inconnu",
          bgColor: "bg-gray-100",
          textColor: "text-gray-800"
        };
    }
  };

  const { icon: Icon, label, bgColor, textColor } = getStatusConfig();

  return (
    <div className={cn(
      "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
      bgColor,
      textColor,
      className
    )}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
};

export default OfferStatusBadge;
