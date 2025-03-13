
import React from "react";
import { Badge } from "@/components/ui/badge";
import { contractStatuses } from "@/services/contractService";
import { cn } from "@/lib/utils";

interface ContractStatusBadgeProps {
  status: string;
  className?: string;
}

const ContractStatusBadge: React.FC<ContractStatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = () => {
    switch (status) {
      case contractStatuses.CONTRACT_SENT:
        return { label: "Contrat envoyé", variant: "secondary" };
      case contractStatuses.CONTRACT_SIGNED:
        return { label: "Contrat signé", variant: "outline" };
      case contractStatuses.EQUIPMENT_ORDERED:
        return { label: "Matériel commandé", variant: "default" };
      case contractStatuses.DELIVERED:
        return { label: "Livré", variant: "success" };
      case contractStatuses.ACTIVE:
        return { label: "Actif", variant: "primary" };
      case contractStatuses.COMPLETED:
        return { label: "Terminé", variant: "muted" };
      default:
        return { label: status, variant: "default" };
    }
  };

  const { label, variant } = getStatusConfig();

  const getVariantClass = () => {
    switch (variant) {
      case "primary":
        return "bg-primary text-primary-foreground hover:bg-primary/80";
      case "success":
        return "bg-green-100 text-green-800 border-green-500";
      case "secondary":
        return "bg-blue-100 text-blue-800 border-blue-500";
      case "outline":
        return "bg-background text-foreground border";
      case "muted":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <Badge className={cn(getVariantClass(), className)}>
      {label}
    </Badge>
  );
};

export default ContractStatusBadge;
