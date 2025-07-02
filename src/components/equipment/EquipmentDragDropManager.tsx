import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Package, GripVertical } from "lucide-react";
import { 
  collaboratorEquipmentService, 
  type EquipmentItem, 
  type CollaboratorEquipment 
} from "@/services/collaboratorEquipmentService";

interface EquipmentDragDropManagerProps {
  clientId: string;
  readOnly?: boolean;
}

const EquipmentDragDropManager: React.FC<EquipmentDragDropManagerProps> = ({
  clientId,
  readOnly = false
}) => {
  const [collaboratorGroups, setCollaboratorGroups] = useState<CollaboratorEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedEquipment, setDraggedEquipment] = useState<string | null>(null);

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

  const onDragStart = (start: any) => {
    setDraggedEquipment(start.draggableId);
  };

  const onDragEnd = async (result: DropResult) => {
    setDraggedEquipment(null);
    
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // Si l'équipement est déposé au même endroit, ne rien faire
    if (source.droppableId === destination.droppableId) return;

    try {
      // Trouver l'équipement qui a été déplacé
      const equipment = collaboratorGroups
        .flatMap(group => group.equipment)
        .find(item => item.id === draggableId);

      if (!equipment) return;

      // Assigner l'équipement au nouveau collaborateur
      const newCollaboratorId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
      
      await collaboratorEquipmentService.assignEquipment(
        equipment.id,
        equipment.equipment_type,
        newCollaboratorId
      );

      // Recharger les données
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

  const getEquipmentTypeColor = (type: 'offer' | 'contract') => {
    return type === 'offer' 
      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' 
      : 'bg-green-100 text-green-800 hover:bg-green-100';
  };

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Gestion des équipements par collaborateur
        </CardTitle>
        <CardDescription>
          Glissez-déposez les équipements pour les assigner aux collaborateurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collaboratorGroups.map((group) => (
              <div key={group.collaborator_id} className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <h3 className="font-medium text-sm">{group.collaborator_name}</h3>
                    {group.collaborator_email && (
                      <p className="text-xs text-muted-foreground">{group.collaborator_email}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {group.equipment.length}
                  </Badge>
                </div>

                <Droppable droppableId={group.collaborator_id} isDropDisabled={readOnly}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] p-3 rounded-lg border-2 border-dashed transition-colors ${
                        snapshot.isDraggingOver
                          ? 'border-primary bg-primary/5'
                          : 'border-muted-foreground/20 bg-muted/10'
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
                                  className={`p-3 bg-background rounded-md border shadow-sm transition-all ${
                                    snapshot.isDragging
                                      ? 'shadow-lg scale-105 rotate-2'
                                      : 'hover:shadow-md'
                                  } ${
                                    draggedEquipment === item.id ? 'opacity-50' : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <span className="font-medium text-xs truncate">{item.title}</span>
                                      </div>
                                      <div className="flex items-center gap-1 mb-1">
                                        <Badge className={`text-xs ${getEquipmentTypeColor(item.equipment_type)}`}>
                                          {item.equipment_type === 'offer' ? 'Offre' : 'Contrat'}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {item.source_name}
                                      </p>
                                      {item.serial_number && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          SN: {item.serial_number}
                                        </p>
                                      )}
                                    </div>
                                    {!readOnly && (
                                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
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
                          <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
                          <p className="text-xs text-muted-foreground">
                            Aucun équipement assigné
                          </p>
                          {!readOnly && (
                            <p className="text-xs text-muted-foreground/70 mt-1">
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
        </DragDropContext>
      </CardContent>
    </Card>
  );
};

export default EquipmentDragDropManager;