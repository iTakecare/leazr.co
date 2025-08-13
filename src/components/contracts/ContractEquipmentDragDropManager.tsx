import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GripVertical, UserPlus, X, HelpCircle, Split, Package, Users, MapPin, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { 
  divideEquipment, 
  assignIndividualEquipment, 
  getContractEquipmentWithIndividuals, 
  ContractEquipment 
} from "@/services/equipmentDivisionService";
import { supabase } from "@/integrations/supabase/client";

interface ContractEquipmentDragDropManagerProps {
  contractId: string;
  readOnly?: boolean;
}

interface CollaboratorGroup {
  collaborator_id: string;
  collaborator_name: string;
  collaborator_email?: string;
  equipment: ContractEquipment[];
}

const ContractEquipmentDragDropManager: React.FC<ContractEquipmentDragDropManagerProps> = ({
  contractId,
  readOnly = false
}) => {
  const [collaboratorGroups, setCollaboratorGroups] = useState<CollaboratorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedEquipment, setDraggedEquipment] = useState<ContractEquipment | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [equipmentToDivide, setEquipmentToDivide] = useState<ContractEquipment | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer tous les équipements du contrat
      const equipments = await getContractEquipmentWithIndividuals(contractId);
      
      // Récupérer les collaborateurs du contrat
      const { data: contractData } = await supabase
        .from('contracts')
        .select('client_id')
        .eq('id', contractId)
        .single();

      if (!contractData) {
        throw new Error('Contrat non trouvé');
      }

      const { data: collaborators } = await supabase
        .from('collaborators')
        .select('*')
        .eq('client_id', contractData.client_id);

      // Grouper les équipements par collaborateur
      const groups: Record<string, ContractEquipment[]> = {
        'unassigned': []
      };

      equipments.forEach(equipment => {
        if (equipment.collaborator_id) {
          if (!groups[equipment.collaborator_id]) {
            groups[equipment.collaborator_id] = [];
          }
          groups[equipment.collaborator_id].push(equipment);
        } else {
          groups['unassigned'].push(equipment);
        }
      });

      // Créer les groupes avec informations des collaborateurs
      const collaboratorGroups: CollaboratorGroup[] = [
        {
          collaborator_id: 'unassigned',
          collaborator_name: 'Non assigné',
          equipment: groups['unassigned']
        }
      ];

      if (collaborators) {
        collaborators.forEach(collab => {
          collaboratorGroups.push({
            collaborator_id: collab.id,
            collaborator_name: collab.name,
            collaborator_email: collab.email,
            equipment: groups[collab.id] || []
          });
        });
      }

      setCollaboratorGroups(collaboratorGroups);
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
    const hasSeenTutorial = localStorage.getItem('equipment-division-tutorial');
    if (!hasSeenTutorial) {
      setTimeout(() => setShowHelp(true), 1000);
    }
  }, [contractId]);

  const handleAssignEquipment = async (equipmentId: string, collaboratorId: string | null) => {
    try {
      await assignIndividualEquipment(equipmentId, collaboratorId);
      
      await fetchData();
      toast.success(
        collaboratorId ? 'Équipement assigné avec succès' : 'Équipement désassigné avec succès'
      );
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    }
  };

  const handleDivideEquipment = async (equipment: ContractEquipment) => {
    if (equipment.is_individual || equipment.quantity <= 1) {
      toast.error("Cet équipement ne peut pas être divisé");
      return;
    }
    setEquipmentToDivide(equipment);
  };

  const confirmDivideEquipment = async () => {
    if (!equipmentToDivide) return;

    try {
      await divideEquipment({
        equipmentId: equipmentToDivide.id,
        serialNumbers: equipmentToDivide.serial_number ? 
          equipmentToDivide.serial_number.split(',').map(s => s.trim()) : []
      });
      
      toast.success(`Équipement divisé en ${equipmentToDivide.quantity} équipements individuels`);
      setEquipmentToDivide(null);
      await fetchData();
    } catch (error) {
      console.error('Error dividing equipment:', error);
      toast.error("Erreur lors de la division de l'équipement");
    }
  };

  const dismissTutorial = () => {
    setShowHelp(false);
    localStorage.setItem('equipment-division-tutorial', 'seen');
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
      await assignIndividualEquipment(draggableId, newCollaboratorId);
      
      await fetchData();
      toast.success(
        newCollaboratorId ? 'Équipement assigné avec succès' : 'Équipement désassigné avec succès'
      );
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      toast.error('Erreur lors de l\'assignation de l\'équipement');
    }
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
                  <h4 className="font-medium text-blue-900 mb-2">Attribution individuelle d'équipements</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <p><strong>Division :</strong> Cliquez sur <Split className="inline h-3 w-3 mx-1" /> pour diviser un équipement en plusieurs équipements individuels</p>
                    <p><strong>Attribution :</strong> Glissez ou utilisez les boutons pour assigner chaque équipement à un collaborateur</p>
                    <p><strong>Avantage :</strong> Un équipement par collaborateur pour une attribution précise</p>
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
                  Attribution individuelle des équipements
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
                    ? "Visualisation des attributions d'équipements individuels" 
                    : "Divisez et assignez chaque équipement individuellement aux collaborateurs"
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
                          </div>
                          <Badge variant="outline">
                            {group.equipment.length}
                          </Badge>
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
                                          <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm truncate">{item.title}</p>
                                            {item.is_individual && (
                                              <Badge variant="secondary" className="text-xs">Individuel</Badge>
                                            )}
                                            {!item.is_individual && item.quantity > 1 && (
                                              <Badge variant="outline" className="text-xs">Groupe ({item.quantity})</Badge>
                                            )}
                                          </div>
                                          {item.individual_serial_number && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              SN: {item.individual_serial_number}
                                            </p>
                                          )}
                                          {item.serial_number && !item.individual_serial_number && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              SN: {item.serial_number}
                                            </p>
                                          )}
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Qté: {item.quantity} • Prix: {item.purchase_price}€
                                          </p>
                                        </div>
                                        {item.monthly_payment && (
                                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                                            {item.monthly_payment}€/mois
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      {/* Contrôles d'attribution */}
                                      {!readOnly && (
                                        <div className="flex items-center gap-2 mt-2">
                                          {/* Bouton pour diviser si nécessaire */}
                                          {!item.is_individual && item.quantity > 1 && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleDivideEquipment(item)}
                                                  className="h-7 w-7 p-0 hover:bg-primary/20"
                                                >
                                                  <Split className="h-3 w-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Diviser en équipements individuels</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                          
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
                                <Package className="h-8 w-8 text-primary mb-2" />
                                <p className="text-sm text-primary font-medium">Déposez l'équipement ici</p>
                              </>
                            ) : (
                              <>
                                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  {group.collaborator_id === 'unassigned' 
                                    ? 'Équipements en attente d\'attribution' 
                                    : 'Aucun équipement assigné'}
                                </p>
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

        {/* Dialog de division d'équipement */}
        <Dialog open={!!equipmentToDivide} onOpenChange={() => setEquipmentToDivide(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Split className="h-5 w-5" />
                Diviser l'équipement
              </DialogTitle>
              <DialogDescription>
                Voulez-vous diviser "{equipmentToDivide?.title}" en {equipmentToDivide?.quantity} équipements individuels ?
                Cela permettra d'assigner chaque élément à un collaborateur différent.
              </DialogDescription>
            </DialogHeader>
            
            {equipmentToDivide && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{equipmentToDivide.title}</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Quantité actuelle: {equipmentToDivide.quantity}</div>
                    {equipmentToDivide.serial_number && (
                      <div>Numéros de série: {equipmentToDivide.serial_number}</div>
                    )}
                    <div>Prix unitaire: {equipmentToDivide.purchase_price}€</div>
                  </div>
                </div>
                
                <div className="text-sm">
                  Après division, vous aurez {equipmentToDivide.quantity} équipements individuels 
                  que vous pourrez assigner séparément à différents collaborateurs.
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEquipmentToDivide(null)}>
                Annuler
              </Button>
              <Button onClick={confirmDivideEquipment}>
                Diviser l'équipement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default ContractEquipmentDragDropManager;