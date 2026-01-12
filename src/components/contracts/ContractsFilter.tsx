
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contractStatuses } from "@/services/contractService";

interface ContractsFilterProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
}

const ContractsFilter: React.FC<ContractsFilterProps> = ({ 
  activeStatus, 
  onStatusChange 
}) => {
  return (
    <Tabs value={activeStatus} onValueChange={onStatusChange}>
      <TabsList className="bg-muted/60">
        <TabsTrigger value="all">Tous</TabsTrigger>
        <TabsTrigger value="in_progress">En cours</TabsTrigger>
        <TabsTrigger value={contractStatuses.CONTRACT_SIGNED}>Signés</TabsTrigger>
        <TabsTrigger value={contractStatuses.ACTIVE}>Actifs</TabsTrigger>
        <TabsTrigger value="expiring_soon">Expiration prochaine</TabsTrigger>
        <TabsTrigger value={contractStatuses.COMPLETED}>Terminés</TabsTrigger>
        <TabsTrigger value={contractStatuses.CANCELLED}>Annulés</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default ContractsFilter;
