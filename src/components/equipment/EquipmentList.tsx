
import React from 'react';
import { Equipment } from '@/types/equipment';
import EquipmentCard from './EquipmentCard';
import { ScrollArea } from "@/components/ui/scroll-area";

interface EquipmentListProps {
  equipment: Equipment[];
  selectedEquipmentId: string | null;
  onSelectEquipment: (equipment: Equipment) => void;
}

const EquipmentList: React.FC<EquipmentListProps> = ({
  equipment,
  selectedEquipmentId,
  onSelectEquipment
}) => {
  if (equipment.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-md border-2 border-dashed border-muted">
        <div className="text-center">
          <p className="text-muted-foreground">Aucun équipement trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-240px)]">
      <div className="pr-4">
        {equipment.map((item) => (
          <EquipmentCard
            key={item.id}
            equipment={item}
            isSelected={selectedEquipmentId === item.id}
            onClick={() => onSelectEquipment(item)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default EquipmentList;
