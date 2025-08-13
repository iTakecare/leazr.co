import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <Card className="h-full flex flex-col border-2 border-primary/20 bg-card">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-primary" />
              Collaborateurs
            </CardTitle>
            <CardDescription className="mt-1">
              Assignez les équipements aux collaborateurs
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
      <CardContent className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto space-y-3">
          {collaboratorGroups.map((group) => (
            <div key={group.collaborator_id} className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate">{group.collaborator_name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {group.equipment.length}
                    </Badge>
                  </div>
                  {group.collaborator_email && (
                    <p className="text-xs text-muted-foreground truncate">{group.collaborator_email}</p>
                  )}
                </div>
              </div>

              <Droppable droppableId={group.collaborator_id} isDropDisabled={readOnly}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[120px] p-2 rounded border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver
                        ? 'border-primary bg-primary/5'
                        : externalDraggedEquipment ? 'border-primary/50 bg-primary/5' : 'border-border'
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
                                className={`p-2 bg-background rounded border transition-all ${
                                  snapshot.isDragging
                                    ? 'shadow-lg scale-105'
                                    : 'hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Package className="h-3 w-3 text-primary flex-shrink-0" />
                                      <span className="font-medium text-sm truncate">{item.title}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {item.source_name}
                                    </p>
                                    {item.serial_number && (
                                      <p className="text-xs font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded mt-1">
                                        {item.serial_number}
                                      </p>
                                    )}
                                  </div>
                                  {!readOnly && (
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted">
                                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-4">
                        <Package className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Aucun équipement
                        </p>
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
    </DragDropContext>
  );
};

export default EquipmentDragDropManager;