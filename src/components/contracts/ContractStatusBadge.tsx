
import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, Send, Package, Truck, Play, AlarmClock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { contractStatuses } from "@/services/contractService";

// Définition des statuts
export const CONTRACT_STATUSES = {
  CONTRACT_SENT: {
    id: contractStatuses.CONTRACT_SENT,
    label: 'Contrat envoyé',
    color: 'bg-blue-100',
    textColor: 'text-blue-700',
    progressValue: 16,
    icon: Send,
  },
  CONTRACT_SIGNED: {
    id: contractStatuses.CONTRACT_SIGNED,
    label: 'Contrat signé',
    color: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    progressValue: 33,
    icon: CheckCircle,
  },
  EQUIPMENT_ORDERED: {
    id: contractStatuses.EQUIPMENT_ORDERED,
    label: 'Matériel commandé',
    color: 'bg-purple-100',
    textColor: 'text-purple-700',
    progressValue: 50,
    icon: Package,
  },
  DELIVERED: {
    id: contractStatuses.DELIVERED,
    label: 'Livré',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
    progressValue: 66,
    icon: Truck,
  },
  ACTIVE: {
    id: contractStatuses.ACTIVE,
    label: 'Actif',
    color: 'bg-green-100',
    textColor: 'text-green-700',
    progressValue: 83,
    icon: Play,
  },
  COMPLETED: {
    id: contractStatuses.COMPLETED,
    label: 'Terminé',
    color: 'bg-gray-100',
    textColor: 'text-gray-700',
    progressValue: 100,
    icon: AlarmClock,
  }
};

interface ContractStatusBadgeProps {
  status?: string;
  showProgress?: boolean;
}

const ContractStatusBadge: React.FC<ContractStatusBadgeProps> = ({ 
  status = 'contract_sent', 
  showProgress = false
}) => {
  // Récupérer les informations du statut
  const statusInfo = Object.values(CONTRACT_STATUSES).find(s => s.id === status) || CONTRACT_STATUSES.CONTRACT_SENT;
  const Icon = statusInfo.icon;

  return (
    <div className="flex flex-col gap-1 w-full">
      <Badge className={cn(
        statusInfo.color,
        statusInfo.textColor,
        "hover:bg-opacity-80"
      )}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
      {showProgress && (
        <Progress 
          value={statusInfo.progressValue} 
          className={cn("h-2", 
            statusInfo.progressValue === 100 ? "bg-green-100" : "bg-gray-100"
          )} 
        />
      )}
    </div>
  );
};

export default ContractStatusBadge;
