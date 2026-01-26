
import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, Send, Package, Truck, Play, AlarmClock, XCircle, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { contractStatuses } from "@/services/contractService";

// Définition des statuts
export const CONTRACT_STATUSES = {
  CONTRACT_SENT: {
    id: contractStatuses.CONTRACT_SENT,
    label: 'Contrat envoyé',
    color: 'bg-blue-50',
    textColor: 'text-blue-700',
    progressValue: 16,
    icon: Send,
  },
  CONTRACT_SIGNED: {
    id: contractStatuses.CONTRACT_SIGNED,
    label: 'Contrat signé',
    color: 'bg-slate-100',
    textColor: 'text-slate-700',
    progressValue: 33,
    icon: CheckCircle,
  },
  EQUIPMENT_ORDERED: {
    id: contractStatuses.EQUIPMENT_ORDERED,
    label: 'Matériel commandé',
    color: 'bg-slate-200',
    textColor: 'text-slate-700',
    progressValue: 50,
    icon: Package,
  },
  DELIVERED: {
    id: contractStatuses.DELIVERED,
    label: 'Livré',
    color: 'bg-amber-50',
    textColor: 'text-amber-800',
    progressValue: 66,
    icon: Truck,
  },
  ACTIVE: {
    id: contractStatuses.ACTIVE,
    label: 'Actif',
    color: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    progressValue: 75,
    icon: Play,
  },
  EXTENDED: {
    id: contractStatuses.EXTENDED,
    label: 'Prolongé',
    color: 'bg-amber-50',
    textColor: 'text-amber-800',
    progressValue: 90,
    icon: Clock,
  },
  COMPLETED: {
    id: contractStatuses.COMPLETED,
    label: 'Terminé',
    color: 'bg-slate-100',
    textColor: 'text-slate-600',
    progressValue: 100,
    icon: AlarmClock,
  },
  CANCELLED: {
    id: contractStatuses.CANCELLED,
    label: 'Annulé',
    color: 'bg-red-50',
    textColor: 'text-red-800',
    progressValue: 0,
    icon: XCircle,
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
