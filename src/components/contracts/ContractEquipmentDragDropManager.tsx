import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Package, GripVertical } from "lucide-react";
import { 
  getContractEquipmentWithIndividuals, 
  ContractEquipment 
} from "@/services/equipmentDivisionService";
import { collaboratorEquipmentService } from "@/services/collaboratorEquipmentService";
import { supabase } from "@/integrations/supabase/client";
import CollaboratorCreationDialog from "@/components/equipment/CollaboratorCreationDialog";

interface ContractEquipmentDragDropManagerProps {
  contractId: string;
  readOnly?: boolean;
  onDragStart?: (start: any) => void;
  onDragEnd?: (result: any) => void;
  draggedEquipment?: any;
}

interface CollaboratorEquipment {
  collaborator_id: string;
  collaborator_name: string;
  collaborator_email?: string;
  equipment: ContractEquipment[];
}

const ContractEquipmentDragDropManager: React.FC<ContractEquipmentDragDropManagerProps> = ({
  contractId,
  readOnly = false,
  onDragStart,
  onDragEnd,
  draggedEquipment: externalDraggedEquipment
}) => {
  const [collaboratorGroups, setCollaboratorGroups] = useState<CollaboratorEquipment[]>([]);
  const [unassignedEquipment, setUnassignedEquipment] = useState<ContractEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [equipmentMap, setEquipmentMap] = useState<Map<string, ContractEquipment>>(new Map());

  const fetchData = async () => {
    if (isDragging) {
      console.log('⚠️ FETCH DATA - Blocked during drag operation');
      return;
    }
    
    setLoading(true);
    try {
      // Récupérer tous les équipements du contrat
      const equipments = await getContractEquipmentWithIndividuals(contractId);
      
      // Créer une Map pour recherche rapide et détecter les doublons
      const newEquipmentMap = new Map<string, ContractEquipment>();
      const duplicateIds: string[] = [];
      
      equipments.forEach(equipment => {
        if (newEquipmentMap.has(equipment.id)) {
          duplicateIds.push(equipment.id);
          console.error('🔴 DUPLICATE ID DETECTED:', equipment.id);
        }
        newEquipmentMap.set(equipment.id, equipment);
      });
      
      if (duplicateIds.length > 0) {
        console.error('💥 CRITICAL: Duplicate equipment IDs found:', duplicateIds);
        toast.error('Erreur: IDs d\'équipements dupliqués détectés');
      }
      
      setEquipmentMap(newEquipmentMap);
      console.log('🗺️ EQUIPMENT MAP - Created with', newEquipmentMap.size, 'items');
      
      // Récupérer les collaborateurs du contrat
      const { data: contractData } = await supabase
        .from('contracts')
        .select('client_id')
        .eq('id', contractId)
        .single();

      if (!contractData) {
        throw new Error('Contrat non trouvé');
      }

      setClientId(contractData.client_id);

      const { data: collaboratorsData } = await supabase
        .from('collaborators')
        .select('*')
        .eq('client_id', contractData.client_id);

      // Créer la structure groupée par collaborateur
      const groups: CollaboratorEquipment[] = [];
      const equipmentByCollaborator: Record<string, ContractEquipment[]> = {};
      const unassignedEquipment: ContractEquipment[] = [];

      // Grouper les équipements par collaborateur
      equipments.forEach(equipment => {
        if (equipment.collaborator_id) {
          if (!equipmentByCollaborator[equipment.collaborator_id]) {
            equipmentByCollaborator[equipment.collaborator_id] = [];
          }
          equipmentByCollaborator[equipment.collaborator_id].push(equipment);
        } else {
          unassignedEquipment.push(equipment);
        }
      });

      // Créer seulement les groupes de collaborateurs avec leurs équipements (sans "Non assigné")
      (collaboratorsData || []).forEach(collab => {
        groups.push({
          collaborator_id: collab.id,
          collaborator_name: collab.name,
          collaborator_email: collab.email,
          equipment: equipmentByCollaborator[collab.id] || []
        });
      });

      setCollaboratorGroups(groups);
      setUnassignedEquipment(unassignedEquipment);
      
      console.log('📊 DATA STRUCTURE:', {
        totalEquipment: equipments.length,
        unassigned: unassignedEquipment.length,
        collaborators: groups.length,
        assignedTotal: groups.reduce((sum, g) => sum + g.equipment.length, 0)
      });
      
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
  }, [contractId]);

  const handleDragStart = (start: any) => {
    console.log('🚀 DRAG START:', { draggableId: start.draggableId, source: start.source });
    setIsDragging(true);
    
    // Call external handler if provided
    if (onDragStart) {
      onDragStart(start);
    }
  };

  const handleDragEnd = async (result: any) => {
    console.log('🎯 DRAG END - Start:', { 
      result: result ? { 
        draggableId: result.draggableId, 
        source: result.source, 
        destination: result.destination 
      } : null 
    });
    
    // Always reset drag state
    setIsDragging(false);
    
    if (!result || !result.destination) {
      console.log('❌ DRAG END - No destination or invalid result, aborting');
      if (onDragEnd) onDragEnd(result);
      return;
    }

    const { source, destination, draggableId } = result;
    
    console.log('🔍 DRAG END - Processing:', { 
      draggableId, 
      sourceId: source.droppableId, 
      destinationId: destination.droppableId,
      sourceIndex: source.index,
      destinationIndex: destination.index,
      equipmentMapSize: equipmentMap.size
    });
    
    if (source.droppableId === destination.droppableId) {
      console.log('❌ DRAG END - Same droppable, aborting');
      if (onDragEnd) onDragEnd(result);
      return;
    }

    try {
      // Utiliser la Map pour une recherche directe et rapide
      const equipment = equipmentMap.get(draggableId);
      
      console.log('🔎 DRAG END - Equipment lookup:', {
        draggableId,
        found: !!equipment,
        equipment: equipment ? { id: equipment.id, title: equipment.title } : null,
        mapKeys: Array.from(equipmentMap.keys()).slice(0, 5) // Show first 5 keys for debug
      });

      if (!equipment) {
        console.error('❌ DRAG END - Equipment not found in Map with ID:', draggableId);
        console.error('📋 Available IDs in Map:', Array.from(equipmentMap.keys()));
        toast.error('Erreur: Équipement non trouvé');
        if (onDragEnd) onDragEnd(result);
        return;
      }

      // Validation des droppableId
      const validDroppableIds = ['unassigned', ...collaboratorGroups.map(g => g.collaborator_id)];
      if (!validDroppableIds.includes(destination.droppableId)) {
        console.error('❌ DRAG END - Invalid destination droppableId:', destination.droppableId);
        console.error('📋 Valid droppableIds:', validDroppableIds);
        toast.error('Erreur: Destination invalide');
        if (onDragEnd) onDragEnd(result);
        return;
      }

      const newCollaboratorId = destination.droppableId === 'unassigned' ? null : destination.droppableId;
      console.log('👤 DRAG END - Assignment details:', { 
        equipmentId: draggableId,
        equipmentTitle: equipment.title,
        oldCollaboratorId: equipment.collaborator_id,
        newCollaboratorId 
      });
      
      // Empêcher l'assignation si c'est déjà le bon collaborateur
      if (equipment.collaborator_id === newCollaboratorId) {
        console.log('ℹ️ DRAG END - Equipment already assigned to this collaborator, skipping');
        if (onDragEnd) onDragEnd(result);
        return;
      }
      
      console.log('🚀 DRAG END - Calling assignEquipment with:', { 
        equipmentId: draggableId, 
        type: 'contract', 
        collaboratorId: newCollaboratorId 
      });
      
      await collaboratorEquipmentService.assignEquipment(draggableId, 'contract', newCollaboratorId);
      
      console.log('✅ DRAG END - Assignment successful, refreshing data');
      
      // Mettre à jour la Map localement pour cohérence
      const updatedEquipment = { ...equipment, collaborator_id: newCollaboratorId };
      setEquipmentMap(prev => new Map(prev.set(draggableId, updatedEquipment)));
      
      await fetchData();

      const collaboratorName = newCollaboratorId === null 
        ? 'Non assigné' 
        : collaboratorGroups.find(c => c.collaborator_id === newCollaboratorId)?.collaborator_name || 'Collaborateur';

      console.log('🎉 DRAG END - Complete! Assigned to:', collaboratorName);
      toast.success(`Équipement "${equipment.title}" assigné à ${collaboratorName}`);
      
      if (onDragEnd) onDragEnd(result);
      
    } catch (error) {
      console.error('💥 DRAG END - Error during assignment:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
      if (onDragEnd) onDragEnd(result);
    }
  };


  const getSerialNumber = (item: ContractEquipment) => {
    if (item.individual_serial_number) {
      return item.individual_serial_number;
    }
    return item.serial_number;
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
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full grid grid-cols-2 gap-4">
        {/* Colonne gauche: Équipements non assignés */}
        <Card className="h-full flex flex-col border-2 border-primary/20 bg-card">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Package className="h-5 w-5 text-primary" />
              Équipements du contrat
              <Badge variant="secondary" className="ml-auto">
                {unassignedEquipment.length}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Glissez les équipements vers les collaborateurs
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <Droppable droppableId="unassigned" isDropDisabled={readOnly}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`h-full p-4 rounded border-2 border-dashed transition-colors overflow-y-auto ${
                    snapshot.isDraggingOver
                      ? 'border-primary bg-primary/5'
                      : externalDraggedEquipment ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                >
                  {unassignedEquipment.length > 0 ? (
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
                              className={`p-3 bg-background rounded-lg border transition-all ${
                                snapshot.isDragging
                                  ? 'shadow-lg scale-105'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Package className="h-4 w-4 text-primary flex-shrink-0" />
                                    <span className="font-medium text-sm truncate">{item.title}</span>
                                  </div>
                                  {getSerialNumber(item) && (
                                    <p className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded mt-1">
                                      SN: {getSerialNumber(item)}
                                    </p>
                                  )}
                                </div>
                                {!readOnly && (
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted">
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
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Package className="h-12 w-12 text-muted-foreground mb-3" />
                      <h4 className="text-sm font-medium text-foreground mb-1">Tous les équipements sont assignés</h4>
                      <p className="text-xs text-muted-foreground">
                        Glissez des équipements ici pour les désassigner
                      </p>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </CardContent>
        </Card>

        {/* Colonne droite: Collaborateurs */}
        <Card className="h-full flex flex-col border-2 border-primary/20 bg-card">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Collaborateurs
                <Badge variant="secondary">
                  {collaboratorGroups.length}
                </Badge>
              </CardTitle>
              {!readOnly && clientId && (
                <CollaboratorCreationDialog 
                  clientId={clientId} 
                  onCollaboratorCreated={fetchData}
                />
              )}
            </div>
            <CardDescription className="mt-1">
              Collaborateurs et leurs équipements assignés
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <div className="h-full overflow-y-auto space-y-4">
              {collaboratorGroups.length > 0 ? (
                collaboratorGroups.map((group) => (
                  <div key={group.collaborator_id} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm truncate">{group.collaborator_name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {group.equipment.length}
                          </Badge>
                        </div>
                        {group.collaborator_email && (
                          <p className="text-xs text-muted-foreground truncate mt-1">{group.collaborator_email}</p>
                        )}
                      </div>
                    </div>

                    <Droppable droppableId={group.collaborator_id} isDropDisabled={readOnly}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[120px] p-3 rounded border-2 border-dashed transition-colors ${
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
                                          {getSerialNumber(item) && (
                                            <p className="text-xs font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded mt-1">
                                              {getSerialNumber(item)}
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
                                Aucun équipement assigné
                              </p>
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-3" />
                  <h4 className="text-sm font-medium text-foreground mb-1">Aucun collaborateur</h4>
                  <p className="text-xs text-muted-foreground">
                    Créez des collaborateurs pour assigner des équipements
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DragDropContext>
  );
};

export default ContractEquipmentDragDropManager;