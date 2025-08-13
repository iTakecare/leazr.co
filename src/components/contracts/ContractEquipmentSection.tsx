
import React, { useState } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Users } from "lucide-react";
import { ContractEquipment } from "@/services/contractService";
import ContractEquipmentDragDropManager from "./ContractEquipmentDragDropManager";
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
      <div className="space-y-6">
        {/* Section informations équipements */}
        <Card className="w-full border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Détails des équipements
            </CardTitle>
            <CardDescription className="text-indigo-700 dark:text-indigo-300">
              Informations détaillées sur chaque équipement inclus dans ce contrat
            </CardDescription>
          </CardHeader>
          <CardContent>
            {equipment && equipment.length > 0 ? (
              <div className="space-y-6">
                {equipment.map((item, index) => {
                  const serialNumbers = getSerialNumbers(item.serial_number, item.quantity);
                  
                  return (
                    <div key={item.id || index} className="space-y-4 p-4 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">{item.title}</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Quantité</p>
                              <p className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">{item.quantity}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Prix d'achat</p>
                              <p className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">{item.purchase_price}€</p>
                            </div>
                          </div>

                          {serialNumbers.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">Numéros de série</p>
                              <div className="flex flex-wrap gap-2">
                                {serialNumbers.map((sn, idx) => (
                                  <Badge key={idx} className="font-mono bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-800 dark:text-indigo-100">
                                    {sn}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.attributes && Array.isArray(item.attributes) && item.attributes.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">Attributs</p>
                              <div className="grid grid-cols-2 gap-4">
                                {item.attributes.map((attr, idx) => (
                                  <div key={idx}>
                                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{attr.key}</p>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300">{attr.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.specifications && Array.isArray(item.specifications) && item.specifications.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">Spécifications techniques</p>
                              <div className="grid grid-cols-2 gap-4">
                                {item.specifications.map((spec, idx) => (
                                  <div key={idx}>
                                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{spec.key}</p>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300">{spec.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {index < equipment.length - 1 && <Separator className="my-6" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-indigo-700 dark:text-indigo-300">Aucun équipement trouvé pour ce contrat.</p>
            )}
          </CardContent>
        </Card>

        {/* Section drag-and-drop pour l'attribution - Les deux managers partagent le même context */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ContractEquipmentDragDropManager 
            contractId={contractId} 
            draggedEquipment={draggedEquipment}
          />
          <EquipmentDragDropManager 
            clientId={clientId}
            draggedEquipment={draggedEquipment}
          />
        </div>
      </div>
    </DragDropContext>
  );
};

export default ContractEquipmentSection;
