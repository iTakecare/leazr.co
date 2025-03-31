
import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Equipment } from '@/types/equipment';
import { Circle } from 'lucide-react';

interface EquipmentCardProps {
  equipment: Equipment;
  isSelected?: boolean;
  onClick?: () => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ 
  equipment, 
  isSelected = false, 
  onClick 
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'En service':
        return 'text-green-500';
      case 'En réserve':
        return 'text-amber-500';
      case 'Remplacement':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card 
      className={`p-4 cursor-pointer mb-1 hover:bg-accent/10 transition-all ${isSelected ? 'bg-accent/20 border-2 border-accent' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
          {equipment.image ? (
            <img 
              src={equipment.image} 
              alt={equipment.title} 
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-gray-500">{equipment.title.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center">
            <Circle className={`h-2.5 w-2.5 mr-1.5 ${getStatusColor(equipment.status)}`} fill="currentColor" />
            <span className="text-sm text-gray-500">{equipment.status}</span>
          </div>
          <h3 className="text-base font-medium">{equipment.title}</h3>
          {equipment.assignedTo && (
            <div className="text-xs text-gray-500">
              {equipment.assignedTo}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default EquipmentCard;
