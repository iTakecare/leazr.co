import React, { useState, useEffect } from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Package, GripVertical } from "lucide-react";
import { 
  getContractEquipmentWithIndividuals, 
  assignIndividualEquipment,
  ContractEquipment 
} from "@/services/equipmentDivisionService";
import { supabase } from "@/integrations/supabase/client";
import CollaboratorCreationDialog from "@/components/equipment/CollaboratorCreationDialog";

interface SimpleContractEquipmentManagerProps {
  contractId: string;
  readOnly?: boolean;
  draggedEquipment?: string | null;
  onRefresh?: () => void;
}

interface Collaborator {
  id: string;
  name: string;
  email?: string;
  role: string;
}

interface CollaboratorWithEquipment extends Collaborator {
  equipment: ContractEquipment[];
}

const SimpleContractEquipmentManager: React.FC<SimpleContractEquipmentManagerProps> = ({
  contractId,
  readOnly = false,
  draggedEquipment: externalDraggedEquipment,
  onRefresh
}) => {
  const [unassignedEquipment, setUnassignedEquipment] = useState<ContractEquipment[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorWithEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const equipments = await getContractEquipmentWithIndividuals(contractId);
      
      const { data: contractData } = await supabase
        .from('contracts')
        .select('client_id')
        .eq('id', contractId)
        .single();

      if (!contractData) throw new Error('Contrat non trouvé');
      setClientId(contractData.client_id);

      const { data: collaboratorsData } = await supabase
        .from('collaborators')
        .select('*')
        .eq('client_id', contractData.client_id);

      const unassigned: ContractEquipment[] = [];
      const equipmentByCollaborator: Record<string, ContractEquipment[]> = {};

      equipments.forEach(equipment => {
        if (equipment.collaborator_id) {
          if (!equipmentByCollaborator[equipment.collaborator_id]) {
            equipmentByCollaborator[equipment.collaborator_id] = [];
          }
          equipmentByCollaborator[equipment.collaborator_id].push(equipment);
        } else {
          unassigned.push(equipment);
        }
      });

      const collaboratorsWithEquipment: CollaboratorWithEquipment[] = (collaboratorsData || []).map(collab => ({
        ...collab,
        equipment: equipmentByCollaborator[collab.id] || []
      }));

      setUnassignedEquipment(unassigned);
      setCollaborators(collaboratorsWithEquipment);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des équipements');
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentMove = async (equipmentId: string, newCollaboratorId: string | null) => {
    try {
      await assignIndividualEquipment(equipmentId, newCollaboratorId);
      toast.success(
        newCollaboratorId ? 'Équipement assigné avec succès' : 'Équipement désassigné avec succès'
      );
      fetchData();
      onRefresh?.();
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    }
  };

  useEffect(() => {
    fetchData();
  }, [contractId]);

  const formatSerialNumbers = (equipment: ContractEquipment) => {
    if (equipment.individual_serial_number) {
      return equipment.individual_serial_number;
    }
    
    if (equipment.serial_number) {
      const numbers = equipment.serial_number.split(',').map(s => s.trim()).filter(Boolean);
      if (numbers.length > 2) {
        return `${numbers.slice(0, 2).join(', ')}...`;
      }
      return numbers.join(', ');
    }
    
    return null;
  };

  const renderEquipmentCard = (item: ContractEquipment, index: number) => (
    <div className="p-3 border rounded-lg bg-background">
      <div className="flex items-center gap-2 mb-2">
        <p className="font-medium text-sm truncate">{item.title}</p>
        <Badge variant="secondary" className="text-xs">
          {item.quantity}
        </Badge>
      </div>
      
      <p className="text-xs text-muted-foreground mb-1">{item.purchase_price}€</p>
      
      {formatSerialNumbers(item) && (
        <p className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
          {formatSerialNumbers(item)}
        </p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex gap-6">
        <div className="flex-1 h-96 bg-muted animate-pulse rounded-lg"></div>
        <div className="flex-1 h-96 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Équipements */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Équipements
            <Badge variant="secondary">{unassignedEquipment.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Droppable droppableId="contract-unassigned" isDropDisabled={readOnly}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[400px] p-3 border-2 border-dashed rounded transition-colors ${
                  snapshot.isDraggingOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                {unassignedEquipment.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Tous assignés</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unassignedEquipment.map((item, index) => (
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
                            className="flex items-center gap-2"
                          >
                            {!readOnly && (
                              <div
                                {...provided.dragHandleProps}
                                className="p-2 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              {renderEquipmentCard(item, index)}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>

      {/* Collaborateurs */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Collaborateurs
                <Badge variant="secondary">{collaborators.length}</Badge>
              </CardTitle>
            </div>
            {!readOnly && clientId && (
              <CollaboratorCreationDialog 
                clientId={clientId} 
                onCollaboratorCreated={fetchData}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {collaborators.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center border-2 border-dashed border-muted rounded-lg">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Aucun collaborateur</p>
              </div>
            ) : (
              collaborators.map((collaborator) => (
                <div key={collaborator.id} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-medium text-sm">{collaborator.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {collaborator.equipment.length}
                    </Badge>
                  </div>

                  <Droppable droppableId={`contract-${collaborator.id}`} isDropDisabled={readOnly}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[80px] p-2 rounded border-2 border-dashed transition-colors ${
                          snapshot.isDraggingOver
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        {collaborator.equipment.length > 0 ? (
                          <div className="space-y-2">
                            {collaborator.equipment.map((item, index) => (
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
                                    className="flex items-center gap-2"
                                  >
                                    {!readOnly && (
                                      <div
                                        {...provided.dragHandleProps}
                                        className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
                                      >
                                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      {renderEquipmentCard(item, index)}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-center py-4">
                            <p className="text-xs text-muted-foreground">
                              Glissez un équipement ici
                            </p>
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleContractEquipmentManager;