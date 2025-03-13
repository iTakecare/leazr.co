
import React from "react";
import { Check, Clock, X } from "lucide-react";

interface OfferStatusBadgeProps {
  status: string;
}

const OfferStatusBadge = ({ status }: OfferStatusBadgeProps) => {
  switch (status) {
    case "accepted":
      return (
        <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
          <Check className="h-3 w-3" />
          <span>Acceptée</span>
        </div>
      );
    case "pending":
      return (
        <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
          <Clock className="h-3 w-3" />
          <span>En attente</span>
        </div>
      );
    case "rejected":
      return (
        <div className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
          <X className="h-3 w-3" />
          <span>Refusée</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
          <Clock className="h-3 w-3" />
          <span>{status || "Inconnu"}</span>
        </div>
      );
  }
};

export default OfferStatusBadge;
