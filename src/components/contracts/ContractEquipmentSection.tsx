
import React, { useState } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Users } from "lucide-react";
import { ContractEquipment } from "@/services/contractService";
import SimpleContractEquipmentManager from "./SimpleContractEquipmentManager";
import EquipmentDragDropManager from "@/components/equipment/EquipmentDragDropManager";
import { collaboratorEquipmentService } from "@/services/collaboratorEquipmentService";
import { assignIndividualEquipment } from "@/services/equipmentDivisionService";
import { toast } from "sonner";

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
  const [draggedEquipment, setDraggedEquipment] = useState<any>(null);

  const handleDragStart = (start: any) => {
    setDraggedEquipment(start.draggableId);
  };

  const handleDragEnd = async (result: DropResult) => {
    setDraggedEquipment(null);
    
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    try {
      // Handle contract equipment assignments
      if (destination.droppableId.startsWith('contract-')) {
        const newCollaboratorId = destination.droppableId === 'contract-unassigned' 
          ? null 
          : destination.droppableId.replace('contract-', '');
        
        await assignIndividualEquipment(draggableId, newCollaboratorId);
        toast.success(
          newCollaboratorId ? 'Équipement assigné avec succès' : 'Équipement désassigné avec succès'
        );
        onRefresh();
        return;
      }

      // Handle regular equipment assignments (from EquipmentDragDropManager)
      if (!destination.droppableId.startsWith('contract-')) {
        const newCollaboratorId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
        
        // Find the equipment to determine its type
        const equipment = await collaboratorEquipmentService.getEquipmentByCollaborator(clientId);
        const item = equipment
          .flatMap(group => group.equipment)
          .find(item => item.id === draggableId);

        if (!item) return;

        await collaboratorEquipmentService.assignEquipment(
          item.id,
          item.equipment_type,
          newCollaboratorId
        );

        const collaboratorName = newCollaboratorId === null 
          ? 'Non assigné' 
          : equipment.find(c => c.collaborator_id === newCollaboratorId)?.collaborator_name || 'Collaborateur';

        toast.success(`Équipement assigné à ${collaboratorName}`);
        onRefresh();
      }
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    }
  };

  const getSerialNumbers = (serialNumbers: string | null, quantity: number): string[] => {
    if (!serialNumbers) return [];
    
    // Si c'est une chaîne JSON, la parser
    try {
      if (serialNumbers.startsWith('[')) {
        return JSON.parse(serialNumbers);
      }
    } catch (e) {
      // Si ça ne parse pas, traiter comme une chaîne simple
    }
    
    // Sinon, diviser par des virgules et nettoyer
    return serialNumbers
      .split(',')
      .map(sn => sn.trim())
      .filter(sn => sn.length > 0)
      .slice(0, quantity);
  };


  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        <div className="flex-1 min-w-0">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Équipements
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {equipment && equipment.length > 0 ? (
                equipment.map((item, index) => {
                  const serialNumbers = getSerialNumbers(item.serial_number, item.quantity);
                  
                  return (
                    <div key={item.id || index} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge variant="secondary">Qté: {item.quantity}</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">{item.purchase_price}€</p>
                      
                      {serialNumbers.length > 0 && (
                        <p className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                          {serialNumbers.slice(0, 2).join(', ')}{serialNumbers.length > 2 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground">Aucun équipement trouvé</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="flex-1 min-w-0">
          <SimpleContractEquipmentManager 
            contractId={contractId} 
            draggedEquipment={draggedEquipment}
          />
        </div>
      </div>
    </DragDropContext>
  );
};

export default ContractEquipmentSection;
