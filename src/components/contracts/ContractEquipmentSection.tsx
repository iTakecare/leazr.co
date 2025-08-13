
import React from "react";
import { ContractEquipment } from "@/services/contractService";
import ContractEquipmentDragDropManager from "./ContractEquipmentDragDropManager";

interface ContractEquipmentSectionProps {
  equipment: ContractEquipment[];
  contractId: string;
  clientId: string;
  onRefresh: () => void;
}

const ContractEquipmentSection: React.FC<ContractEquipmentSectionProps> = ({ 
  equipment, 
  contractId,
  clientId,
  onRefresh 
}) => {
  
  return (
    <ContractEquipmentDragDropManager 
      contractId={contractId}
    />
  );
};

export default ContractEquipmentSection;
