import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, GripVertical, UserPlus, X, HelpCircle, CheckCircle } from "lucide-react";
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
  const [showHelp, setShowHelp] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  

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
    // Vérifier si c'est la première fois
    const hasSeenTutorial = localStorage.getItem('equipment-drag-drop-tutorial');
    if (!hasSeenTutorial) {
      setTimeout(() => setShowHelp(true), 1000);
      setIsFirstTime(true);
    } else {
      setIsFirstTime(false);
    }
  }, [contractId]);

  const handleAssignEquipment = async (equipmentId: string, collaboratorId: string | null) => {
    try {
      await collaboratorEquipmentService.assignEquipment(
        equipmentId, 
        'contract', 
        collaboratorId
      );
      
      await fetchData();
      toast.success(
        collaboratorId ? 'Équipement assigné avec succès' : 'Équipement désassigné avec succès'
      );
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    }
  };

  const dismissTutorial = () => {
    setShowHelp(false);
    localStorage.setItem('equipment-drag-drop-tutorial', 'seen');
  };

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
    <TooltipProvider>
      <div className="space-y-6">
        {/* Aide tutoriel */}
        {showHelp && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">Guide d'utilisation</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p><strong>Méthode 1 - Drag & Drop :</strong> Cliquez et maintenez sur la poignée <GripVertical className="inline h-3 w-3 mx-1" /> puis glissez l'équipement vers un collaborateur</p>
                    <p><strong>Méthode 2 - Boutons :</strong> Utilisez les boutons "Assigner" pour choisir un collaborateur dans la liste</p>
                    <p><strong>Zones colorées :</strong> Les zones se colorent en bleu quand vous pouvez y déposer un équipement</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={dismissTutorial}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Attribution des équipements
                  {!readOnly && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowHelp(!showHelp)}
                        >
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Afficher/masquer l'aide</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </CardTitle>
                <CardDescription>
                  {readOnly 
                    ? "Visualisation des attributions d'équipements" 
                    : "Assignez les équipements aux collaborateurs par glisser-déposer ou avec les boutons"
                  }
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
                      className={`border-2 rounded-lg p-4 min-h-[200px] transition-all duration-200 ${
                        snapshot.isDraggingOver
                          ? 'border-primary bg-primary/5 border-dashed shadow-lg'
                          : draggedEquipment ? 'border-dashed border-muted-foreground/30 bg-muted/20' : 'border-border'
                      } ${!readOnly ? 'hover:border-primary/30 hover:bg-muted/10' : ''}`}
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
                                className={`p-3 rounded-md border transition-all ${
                                  snapshot.isDragging
                                    ? 'shadow-lg border-primary bg-background transform rotate-2'
                                    : 'border-border bg-background hover:bg-muted/50 hover:shadow-md'
                                } ${!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
                              >
                                <div className="flex items-start gap-3">
                                  {!readOnly && (
                                    <div
                                      {...provided.dragHandleProps}
                                      className="flex-shrink-0 pt-1"
                                    >
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="p-1 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing">
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Glissez pour déplacer</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{item.title}</p>
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
                                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                                          {item.monthly_payment}€/mois
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Alternative au drag-and-drop */}
                                    {!readOnly && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <Select
                                          onValueChange={(value) => handleAssignEquipment(item.id, value === 'unassigned' ? null : value)}
                                          defaultValue={group.collaborator_id === 'unassigned' ? 'unassigned' : group.collaborator_id}
                                        >
                                          <SelectTrigger className="h-7 text-xs flex-1">
                                            <SelectValue placeholder="Assigner à..." />
                                          </SelectTrigger>
                                          <SelectContent className="z-50">
                                            <SelectItem value="unassigned">Non assigné</SelectItem>
                                            {collaboratorGroups
                                              .filter(g => g.collaborator_id !== 'unassigned')
                                              .map(collaborator => (
                                                <SelectItem key={collaborator.collaborator_id} value={collaborator.collaborator_id}>
                                                  {collaborator.collaborator_name}
                                                </SelectItem>
                                              ))
                                            }
                                          </SelectContent>
                                        </Select>
                                        
                                        {group.collaborator_id !== 'unassigned' && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleAssignEquipment(item.id, null)}
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Désassigner</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                      
                      {group.equipment.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          {snapshot.isDraggingOver ? (
                            <>
                              <CheckCircle className="h-8 w-8 text-primary mb-2 animate-pulse" />
                              <p className="text-sm text-primary font-medium">
                                Déposez l'équipement ici
                              </p>
                            </>
                          ) : (
                            <>
                              <Package className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Aucun équipement assigné
                              </p>
                              {!readOnly && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Glissez un équipement ou utilisez les boutons d'assignation
                                </p>
                              )}
                            </>
                          )}
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
    </TooltipProvider>
  );
};

export default ContractEquipmentDragDropManager;