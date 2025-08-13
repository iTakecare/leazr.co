import React, { useState, useEffect } from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Package, GripVertical } from "lucide-react";
import { 
  collaboratorEquipmentService, 
  type EquipmentItem, 
  type CollaboratorEquipment 
} from "@/services/collaboratorEquipmentService";
import CollaboratorCreationDialog from "./CollaboratorCreationDialog";

interface EquipmentDragDropManagerProps {
  clientId: string;
  readOnly?: boolean;
  onDragStart?: (start: any) => void;
  onDragEnd?: (result: any) => void;
  draggedEquipment?: string | null;
}

const EquipmentDragDropManager: React.FC<EquipmentDragDropManagerProps> = ({
  clientId,
  readOnly = false,
  onDragStart,
  onDragEnd,
  draggedEquipment: externalDraggedEquipment
}) => {
  const [collaboratorGroups, setCollaboratorGroups] = useState<CollaboratorEquipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const collaboratorData = await collaboratorEquipmentService.getEquipmentByCollaborator(clientId);
      setCollaboratorGroups(collaboratorData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      if (error instanceof Error && !error.message.includes('No rows')) {
        toast.error('Erreur lors du chargement des équipements');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination || result.destination.droppableId.startsWith('contract-')) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    try {
      const equipment = collaboratorGroups
        .flatMap(group => group.equipment)
        .find(item => item.id === draggableId);

      if (!equipment) return;

      const newCollaboratorId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
      
      await collaboratorEquipmentService.assignEquipment(
        equipment.id,
        equipment.equipment_type,
        newCollaboratorId
      );

      await fetchData();

      const collaboratorName = newCollaboratorId === null 
        ? 'Non assigné' 
        : collaboratorGroups.find(c => c.collaborator_id === newCollaboratorId)?.collaborator_name || 'Collaborateur';

      toast.success(`Équipement assigné à ${collaboratorName}`);
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    }
  };

  React.useEffect(() => {
    if (onDragEnd) {
      // Overwrite with external handler if provided
    }
  }, [onDragEnd]);


  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 dark:border-blue-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Assignation des équipements contractuels
            </CardTitle>
            <CardDescription className="mt-2 text-blue-700 dark:text-blue-300">
              Glissez-déposez les équipements de contrats pour les assigner aux collaborateurs (numéros de série disponibles)
            </CardDescription>
          </div>
          {!readOnly && (
            <CollaboratorCreationDialog 
              clientId={clientId} 
              onCollaboratorCreated={fetchData}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {collaboratorGroups.map((group) => (
            <div key={group.collaborator_id} className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-emerald-900 dark:text-emerald-100 truncate">{group.collaborator_name}</h3>
                    {group.collaborator_id !== 'unassigned' && (
                      <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white">
                        Principal
                      </Badge>
                    )}
                  </div>
                  {group.collaborator_email && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 truncate">{group.collaborator_email}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs bg-white/80 text-emerald-800 border-emerald-300 font-semibold">
                  {group.equipment.length}
                </Badge>
              </div>

              <Droppable droppableId={group.collaborator_id} isDropDisabled={readOnly}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[180px] max-h-[300px] overflow-y-auto p-3 rounded-lg border-2 border-dashed transition-all duration-300 ${
                      snapshot.isDraggingOver
                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/50 shadow-lg scale-[1.02]'
                        : externalDraggedEquipment ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20' : 'border-gray-300 bg-gray-50/50 dark:bg-gray-800/50'
                    }`}
                  >
                    {group.equipment.length > 0 ? (
                      <div className="space-y-2">
                        {group.equipment.map((item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={item.id}
                            index={index}
                            isDragDisabled={readOnly}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 shadow-sm transition-all duration-200 ${
                                  snapshot.isDragging
                                    ? 'shadow-xl scale-105 rotate-1 border-l-orange-500 z-50'
                                    : 'hover:shadow-md border-l-blue-400'
                                } ${
                                  externalDraggedEquipment === item.id ? 'opacity-60 scale-95' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                      <span className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{item.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mb-2">
                                      <Badge className="text-xs bg-green-500 hover:bg-green-500 text-white font-medium">
                                        Contrat
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                      {item.source_name}
                                    </p>
                                    {item.serial_number && (
                                      <p className="text-xs font-mono text-gray-500 dark:text-gray-500 truncate bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1">
                                        SN: {item.serial_number}
                                      </p>
                                    )}
                                  </div>
                                  {!readOnly && (
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                                      <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                    </div>
                                  )}
                                </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          Aucun équipement assigné
                        </p>
                        {!readOnly && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Glissez des équipements ici
                          </p>
                        )}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentDragDropManager;