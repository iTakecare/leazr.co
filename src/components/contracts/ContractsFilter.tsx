
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
        <TabsTrigger value={contractStatuses.CONTRACT_SENT}>Envoyés</TabsTrigger>
        <TabsTrigger value={contractStatuses.CONTRACT_SIGNED}>Signés</TabsTrigger>
        <TabsTrigger value={contractStatuses.EQUIPMENT_ORDERED}>Commandés</TabsTrigger>
        <TabsTrigger value={contractStatuses.DELIVERED}>Livrés</TabsTrigger>
        <TabsTrigger value={contractStatuses.ACTIVE}>Actifs</TabsTrigger>
        <TabsTrigger value={contractStatuses.COMPLETED}>Terminés</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default ContractsFilter;
