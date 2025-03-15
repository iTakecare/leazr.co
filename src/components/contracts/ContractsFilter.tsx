
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contractStatuses } from "@/services/contractService";

interface ContractsFilterProps {
  activeStatus: string;
  onStatusChange: (value: string) => void;
}

const ContractsFilter = ({ activeStatus, onStatusChange }: ContractsFilterProps) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs defaultValue={activeStatus} onValueChange={onStatusChange} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value={contractStatuses.CONTRACT_SENT}>Envoyés</TabsTrigger>
            <TabsTrigger value={contractStatuses.CONTRACT_SIGNED}>Signés</TabsTrigger>
            <TabsTrigger value={contractStatuses.EQUIPMENT_ORDERED}>Commandés</TabsTrigger>
            <TabsTrigger value={contractStatuses.DELIVERED}>Livrés</TabsTrigger>
            <TabsTrigger value={contractStatuses.ACTIVE}>Actifs</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};

export default ContractsFilter;
