
import React from "react";

// This is a stub component to fix build errors
interface EquipmentListProps {
  equipmentList: any[];
  editingId: string | null;
  startEditing: (id: string) => void;
  removeFromList: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalMonthlyPayment: number;
  globalMarginAdjustment: any;
}

const EquipmentList: React.FC<EquipmentListProps> = () => {
  return <div>Equipment List Placeholder</div>;
};

export default EquipmentList;
