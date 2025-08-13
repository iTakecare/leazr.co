import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Package, MapPin, Edit2 } from "lucide-react";
import { 
  collaboratorEquipmentService, 
  type EquipmentItem, 
  type CollaboratorEquipment 
} from "@/services/collaboratorEquipmentService";
import { supabase } from "@/integrations/supabase/client";

interface ContractEquipmentDragDropManagerProps {
  contractId: string;
  readOnly?: boolean;
}

const ContractEquipmentDragDropManager: React.FC<ContractEquipmentDragDropManagerProps> = ({
  contractId,
  readOnly = false
}) => {
  const [collaboratorGroups, setCollaboratorGroups] = useState<CollaboratorEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedEquipment, setDraggedEquipment] = useState<EquipmentItem | null>(null);
  

  const fetchData = async () => {
    setLoading(true);
    try {
      // Pour un contrat spécifique, nous devons d'abord récupérer le client_id
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('client_id')
        .eq('id', contractId)
        .single();

      if (contractError) {
        throw contractError;
      }

      const clientId = contractData.client_id;
      
      // Récupérer les équipements groupés par collaborateur pour ce client
      const collaboratorData = await collaboratorEquipmentService.getEquipmentByCollaborator(clientId);
      
      // Filtrer uniquement les équipements du contrat spécifique
      const filteredGroups = collaboratorData.map(group => ({
        ...group,
        equipment: group.equipment.filter(item => 
          item.equipment_type === 'contract' && item.source_id === contractId
        )
      }));
      
      setCollaboratorGroups(filteredGroups);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des équipements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [contractId]);

  const onDragStart = (start: any) => {
    const equipment = collaboratorGroups
      .flatMap(group => group.equipment)
      .find(item => item.id === start.draggableId);
    setDraggedEquipment(equipment || null);
  };

  const onDragEnd = async (result: DropResult) => {
    setDraggedEquipment(null);
    
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newCollaboratorId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
    
    try {
      await collaboratorEquipmentService.assignEquipment(
        draggableId, 
        'contract', 
        newCollaboratorId
      );
      
      await fetchData();
      toast.success(
        newCollaboratorId ? 'Équipement assigné avec succès' : 'Équipement désassigné avec succès'
      );
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    }
  };

  const getCollaboratorAddress = (collaboratorId: string) => {
    // TODO: Intégrer avec les adresses de livraison des collaborateurs
    return null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Attribution des équipements
              </CardTitle>
              <CardDescription>
                Glissez-déposez les équipements vers les collaborateurs appropriés
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collaboratorGroups.map((group) => (
                <Droppable 
                  key={group.collaborator_id} 
                  droppableId={group.collaborator_id}
                  isDropDisabled={readOnly}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`border rounded-lg p-4 min-h-[200px] transition-colors ${
                        snapshot.isDraggingOver
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium">{group.collaborator_name}</h3>
                          </div>
                          {group.collaborator_email && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {group.collaborator_email}
                            </p>
                          )}
                          {getCollaboratorAddress(group.collaborator_id) && (
                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>Adresse de livraison définie</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {group.equipment.length}
                          </Badge>
                          {!readOnly && group.collaborator_id !== 'unassigned' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Ouvrir dialog d'édition adresse
                                toast.info('Configuration adresse à venir');
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
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
                                {...provided.dragHandleProps}
                                className={`p-3 rounded-md border transition-all ${
                                  snapshot.isDragging
                                    ? 'shadow-lg border-primary bg-background'
                                    : 'border-border bg-muted/30 hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{item.title}</p>
                                    {item.serial_number && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        SN: {item.serial_number}
                                      </p>
                                    )}
                                    {item.quantity && item.quantity > 1 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Quantité: {item.quantity}
                                      </p>
                                    )}
                                  </div>
                                  {item.monthly_payment && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      {item.monthly_payment}€/mois
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                      
                      {group.equipment.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Package className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {snapshot.isDraggingOver 
                              ? "Déposez l'équipement ici"
                              : "Aucun équipement assigné"
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </CardContent>
      </Card>

    </div>
  );
};

export default ContractEquipmentDragDropManager;